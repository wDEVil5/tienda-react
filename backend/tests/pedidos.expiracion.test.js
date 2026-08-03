import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPedidos } from '../src/modules/pedidos/pedidos.service.js'

test('expirarPedidosPendientes calcula la ventana y expira cada vencido', async () => {
  let antesDeRecibido
  const cancelados = []
  const repositorio = {
    async listarPendientesExpirados(antesDe) {
      antesDeRecibido = antesDe
      return [{ id: 'p1' }, { id: 'p2' }]
    },
    async expirarPendienteTransaccional(id) {
      cancelados.push(id)
      return { id } // truthy = se expiró
    },
  }
  const servicio = crearServicioPedidos(repositorio)

  const ahora = new Date('2026-08-03T12:00:00.000Z')
  const resultado = await servicio.expirarPedidosPendientes({ ahora, minutos: 60 })

  assert.deepEqual(cancelados, ['p1', 'p2'])
  assert.deepEqual(resultado, { revisados: 2, expirados: 2 })
  // La ventana es ahora − 60 min.
  assert.equal(antesDeRecibido.toISOString(), '2026-08-03T11:00:00.000Z')
})

test('expirarPedidosPendientes no cuenta los que ya no estaban pendientes', async () => {
  const repositorio = {
    async listarPendientesExpirados() {
      return [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]
    },
    async expirarPendienteTransaccional(id) {
      // p2 fue aceptado justo antes: la guarda atómica devuelve null.
      return id === 'p2' ? null : { id }
    },
  }
  const servicio = crearServicioPedidos(repositorio)

  const resultado = await servicio.expirarPedidosPendientes({ minutos: 30 })

  assert.deepEqual(resultado, { revisados: 3, expirados: 2 })
})
