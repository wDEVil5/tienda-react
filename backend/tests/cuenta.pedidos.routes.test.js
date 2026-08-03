import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterPedidosCliente } from '../src/modules/cuenta/cuenta.pedidos.routes.js'

// Middleware de cliente falso: fija request.cliente para probar que el historial
// se acota a la sesión (no a un id del cliente pasado por fuera).
function crearApp(servicio) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/cuenta/pedidos',
    crearRouterPedidosCliente(servicio, {
      middlewareCliente: (request, _response, next) => {
        request.cliente = { id: 'c1' }
        next()
      },
    }),
  )
  return app
}

test('GET / lista los pedidos del cliente acotado a su id', async () => {
  let recibido
  const app = crearApp({
    async listarPedidosDeCliente(clienteId, opciones) {
      recibido = { clienteId, opciones }
      return { data: [{ numero: 1 }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }
    },
  })

  const response = await request(app).get('/api/cuenta/pedidos')

  assert.equal(response.status, 200)
  assert.equal(response.body.data[0].numero, 1)
  assert.equal(recibido.clienteId, 'c1')
})

test('GET / rechaza un estado inválido (400)', async () => {
  const app = crearApp({
    async listarPedidosDeCliente() {
      throw new Error('no debería llamarse')
    },
  })

  const response = await request(app).get('/api/cuenta/pedidos?estado=INVENTADO')

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_QUERY_PARAM')
})

test('GET /:id devuelve el detalle si el pedido es del cliente', async () => {
  const app = crearApp({
    async obtenerPedidoDeCliente(clienteId, id) {
      return { numero: 7, id }
    },
  })

  const response = await request(app).get('/api/cuenta/pedidos/p7')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.numero, 7)
})

test('GET /:id responde 404 si el pedido no es del cliente', async () => {
  const app = crearApp({
    async obtenerPedidoDeCliente() {
      return null
    },
  })

  const response = await request(app).get('/api/cuenta/pedidos/ajeno')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ORDER_NOT_FOUND')
})
