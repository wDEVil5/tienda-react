import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterAdmin } from '../src/modules/admin/admin.routes.js'
import { ErrorPedido } from '../src/modules/pedidos/pedidos.service.js'

// Igual que admin.routes.test: router admin con sesión y servicio falsos, para
// probar la ruta (permisos, validación, códigos) sin tocar la base de datos.
function crearApp(servicio, { rol = 'OPERADOR' } = {}) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/admin',
    crearRouterAdmin({
      middlewareSesion: (request, _response, next) => {
        request.usuario = { id: 'u1', rol }
        next()
      },
      servicio,
    }),
  )
  return app
}

test('GET /api/admin/pedidos lista pedidos para el panel', async () => {
  let filtros
  const app = crearApp({
    async listarPedidos(recibidos) {
      filtros = recibidos
      return { data: [{ id: 'ped-1', numero: 1 }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }
    },
  })

  const response = await request(app).get('/api/admin/pedidos')

  assert.equal(response.status, 200)
  assert.equal(response.body.data[0].numero, 1)
  assert.deepEqual(filtros, { page: 1, limit: 20, estado: undefined, q: '' })
})

test('GET /api/admin/pedidos pasa el término de búsqueda al servicio', async () => {
  let filtros
  const app = crearApp({
    async listarPedidos(recibidos) {
      filtros = recibidos
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, conteos: {} } }
    },
  })

  const response = await request(app).get('/api/admin/pedidos?q=camila')

  assert.equal(response.status, 200)
  assert.equal(filtros.q, 'camila')
})

test('GET /api/admin/pedidos acepta filtro de estado válido', async () => {
  let filtros
  const app = crearApp({
    async listarPedidos(recibidos) {
      filtros = recibidos
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }
    },
  })

  const response = await request(app).get('/api/admin/pedidos?estado=PENDIENTE')

  assert.equal(response.status, 200)
  assert.equal(filtros.estado, 'PENDIENTE')
})

test('GET /api/admin/pedidos rechaza un estado inválido', async () => {
  const app = crearApp({ async listarPedidos() { return { data: [], meta: {} } } })

  const response = await request(app).get('/api/admin/pedidos?estado=INVENTADO')

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_QUERY_PARAM')
})

test('GET /api/admin/pedidos/:id devuelve el detalle', async () => {
  const app = crearApp({
    async obtenerDetallePedido() {
      return { id: 'ped-1', numero: 1, estado: 'ENTREGADO', eventos: [] }
    },
  })

  const response = await request(app).get('/api/admin/pedidos/ped-1')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.numero, 1)
})

test('GET /api/admin/pedidos/:id responde 404 si no existe', async () => {
  const app = crearApp({ async obtenerDetallePedido() { return null } })

  const response = await request(app).get('/api/admin/pedidos/fantasma')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ADMIN_ORDER_NOT_FOUND')
})

test('PATCH /api/admin/pedidos/:id/estado avanza el estado', async () => {
  let recibido
  const app = crearApp({
    async cambiarEstadoPedido(id, estado, nota) {
      recibido = { id, estado, nota }
      return { id, numero: 1, estado, eventos: [] }
    },
  })

  const response = await request(app)
    .patch('/api/admin/pedidos/ped-1/estado')
    .send({ estado: 'PREPARANDO', nota: 'A preparar' })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.estado, 'PREPARANDO')
  assert.equal(recibido.nota, 'A preparar')
})

test('PATCH /api/admin/pedidos/:id/estado responde 422 ante un estado inválido', async () => {
  const app = crearApp({ async cambiarEstadoPedido() { throw new Error('no debería llamarse') } })

  const response = await request(app)
    .patch('/api/admin/pedidos/ped-1/estado')
    .send({ estado: 'INVENTADO' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_ORDER_STATE')
})

test('PATCH /api/admin/pedidos/:id/estado responde 409 ante una transición no permitida', async () => {
  const app = crearApp({
    async cambiarEstadoPedido() {
      throw new ErrorPedido('INVALID_ORDER_TRANSITION', 'No se puede pasar de PENDIENTE a ENTREGADO.')
    },
  })

  const response = await request(app)
    .patch('/api/admin/pedidos/ped-1/estado')
    .send({ estado: 'ENTREGADO' })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'INVALID_ORDER_TRANSITION')
})

test('PATCH /api/admin/pedidos/:id/estado responde 404 si el pedido no existe', async () => {
  const app = crearApp({ async cambiarEstadoPedido() { return null } })

  const response = await request(app)
    .patch('/api/admin/pedidos/fantasma/estado')
    .send({ estado: 'PREPARANDO' })

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ADMIN_ORDER_NOT_FOUND')
})
