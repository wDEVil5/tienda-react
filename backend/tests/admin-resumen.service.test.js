import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioResumen } from '../src/modules/admin/admin-resumen.service.js'

// Repo falso: ventasAprobadas se llama dos veces (período actual, luego el
// anterior); devolvemos de una cola para poder afirmar sobre la comparación.
function crearRepoFalso({
  ventas = [{ monto: 20000, pagos: 4 }, { monto: 10000, pagos: 2 }],
  modalidad = { retiro: 12000, despacho: 8000 },
  pedidos = 14,
  pendientes = 9,
  stockCritico = 2,
} = {}) {
  const cola = [...ventas]
  const capturado = { rangos: [], umbral: null }
  const repositorio = {
    async ventasAprobadas(rango) {
      capturado.rangos.push(rango)
      return cola.shift()
    },
    async ventasPorModalidad() { return modalidad },
    async contarPedidos() { return pedidos },
    async contarPendientesPreparar() { return pendientes },
    async contarStockCritico(umbral) { capturado.umbral = umbral; return stockCritico },
  }
  return { repositorio, capturado }
}

test('obtenerResumen arma KPIs, ticket promedio y variación', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioResumen(repositorio)

  const resumen = await servicio.obtenerResumen({ periodo: 'mes' })

  assert.equal(resumen.ventas.actual, 20000)
  assert.equal(resumen.ventas.anterior, 10000)
  assert.equal(resumen.ventas.variacion, 100) // (20000-10000)/10000
  assert.equal(resumen.ticketPromedio.actual, 5000) // 20000/4
  assert.equal(resumen.ticketPromedio.anterior, 5000) // 10000/2
  assert.equal(resumen.ticketPromedio.variacion, 0)
  assert.equal(resumen.pedidos.total, 14)
  assert.equal(resumen.pedidos.pendientesPreparar, 9)
  assert.equal(resumen.stockCritico, 2)
  assert.deepEqual(resumen.modalidad, { retiro: 12000, despacho: 8000 })
})

test('la variación es null cuando el período anterior fue cero (sin dividir por cero)', async () => {
  const { repositorio } = crearRepoFalso({
    ventas: [{ monto: 20000, pagos: 4 }, { monto: 0, pagos: 0 }],
  })
  const servicio = crearServicioResumen(repositorio)

  const resumen = await servicio.obtenerResumen({ periodo: 'mes' })

  assert.equal(resumen.ventas.variacion, null)
  assert.equal(resumen.ticketPromedio.actual, 5000)
  assert.equal(resumen.ticketPromedio.anterior, 0)
  assert.equal(resumen.ticketPromedio.variacion, null)
})

test("el período 'mes' consulta desde el día 1 y compara con el mes anterior", async () => {
  const { repositorio, capturado } = crearRepoFalso()
  const servicio = crearServicioResumen(repositorio)

  const ahora = new Date('2026-07-15T12:00:00')
  const resumen = await servicio.obtenerResumen({ periodo: 'mes', ahora })

  const [actual, anterior] = capturado.rangos
  assert.equal(actual.desde.getFullYear(), 2026)
  assert.equal(actual.desde.getMonth(), 6) // julio (0-index)
  assert.equal(actual.desde.getDate(), 1)
  assert.equal(anterior.desde.getMonth(), 5) // junio
  assert.equal(resumen.comparacion, 'junio')
  assert.equal(capturado.umbral, 3) // umbral global por defecto
})

test("el período 'hoy' arranca a medianoche y compara con ayer", async () => {
  const { repositorio, capturado } = crearRepoFalso()
  const servicio = crearServicioResumen(repositorio)

  const ahora = new Date('2026-07-15T18:30:00')
  const resumen = await servicio.obtenerResumen({ periodo: 'hoy', ahora })

  const [actual] = capturado.rangos
  assert.equal(actual.desde.getDate(), 15)
  assert.equal(actual.desde.getHours(), 0)
  assert.equal(resumen.comparacion, 'ayer')
})
