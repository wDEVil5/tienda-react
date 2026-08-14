import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioInventarioAdmin } from '../src/modules/admin/admin-inventario.service.js'

// Cuatro productos que cubren los tres estados de stock (con umbral por defecto 3):
// - Arroz: disponible 20 → DISPONIBLE
// - Leche: stock 5, reservado 3 → disponible 2, umbral propio 5 → ULTIMAS_UNIDADES
// - Queso: disponible 0 → AGOTADO
// - Sal: disponible 2, sin umbral propio → cae al defecto 3 → ULTIMAS_UNIDADES
function productosFalsos() {
  return [
    { id: 'p1', nombre: 'Arroz', sku: 'ARR', estado: 'PUBLICADO', stock: 20, stockReservado: 0, alertaStockBajo: null },
    { id: 'p2', nombre: 'Leche', sku: 'LEC', estado: 'PUBLICADO', stock: 5, stockReservado: 3, alertaStockBajo: 5 },
    { id: 'p3', nombre: 'Queso', sku: 'QUE', estado: 'BORRADOR', stock: 4, stockReservado: 4, alertaStockBajo: null },
    { id: 'p4', nombre: 'Sal', sku: 'SAL', estado: 'PUBLICADO', stock: 2, stockReservado: 0, alertaStockBajo: null },
  ]
}

function crearRepoFalso(productos = productosFalsos()) {
  const capturado = { query: null }
  const repositorio = {
    async listarParaInventario(query) {
      capturado.query = query
      return productos
    },
  }
  return { repositorio, capturado }
}

test('listarInventario deriva disponible y estado de stock, y resume el conjunto', async () => {
  const { repositorio, capturado } = crearRepoFalso()
  const servicio = crearServicioInventarioAdmin(repositorio)

  const { data, resumen } = await servicio.listarInventario({ query: 'que' })

  assert.equal(capturado.query, 'que') // el texto llega al repositorio

  const porId = new Map(data.map((fila) => [fila.id, fila]))
  assert.equal(porId.get('p1').estadoStock, 'DISPONIBLE')
  assert.equal(porId.get('p1').disponible, 20)
  assert.equal(porId.get('p2').estadoStock, 'ULTIMAS_UNIDADES')
  assert.equal(porId.get('p2').disponible, 2)
  assert.equal(porId.get('p3').estadoStock, 'AGOTADO')
  assert.equal(porId.get('p4').umbralEfectivo, 3) // umbral por defecto
  assert.equal(porId.get('p4').estadoStock, 'ULTIMAS_UNIDADES')

  assert.deepEqual(resumen, { total: 4, disponibles: 1, bajos: 2, agotados: 1 })
})

test('soloBajoStock filtra los que necesitan reposición (agotado o últimas unidades)', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioInventarioAdmin(repositorio)

  const { data, meta, resumen } = await servicio.listarInventario({ soloBajoStock: true })

  const ids = data.map((fila) => fila.id).sort()
  assert.deepEqual(ids, ['p2', 'p3', 'p4']) // Arroz (DISPONIBLE) queda fuera
  assert.equal(meta.total, 3)
  // El resumen NO cambia con el filtro: sigue contando todo el conjunto.
  assert.equal(resumen.total, 4)
})

test('listarInventario pagina sobre las filas ya filtradas', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioInventarioAdmin(repositorio)

  const pagina1 = await servicio.listarInventario({ page: 1, limit: 2 })
  const pagina2 = await servicio.listarInventario({ page: 2, limit: 2 })

  assert.equal(pagina1.data.length, 2)
  assert.equal(pagina2.data.length, 2)
  assert.equal(pagina1.meta.totalPages, 2)
  // Orden estable: sin solaparse entre páginas.
  const ids1 = pagina1.data.map((f) => f.id)
  const ids2 = pagina2.data.map((f) => f.id)
  assert.equal(ids1.some((id) => ids2.includes(id)), false)
})
