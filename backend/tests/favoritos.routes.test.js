import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterFavoritos } from '../src/modules/favoritos/favoritos.routes.js'
import { ErrorFavorito } from '../src/modules/favoritos/favoritos.service.js'

// Middleware de cliente falso: fija request.cliente para probar que todo se
// acota a la sesión (el clienteId nunca viene del cuerpo ni de la URL).
function crearApp(servicio) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/cuenta/favoritos',
    crearRouterFavoritos(servicio, {
      middlewareCliente: (request, _response, next) => {
        request.cliente = { id: 'c1' }
        next()
      },
    }),
  )
  return app
}

test('GET / devuelve las tarjetas y los ids del cliente de la sesión', async () => {
  let recibido
  const app = crearApp({
    async listar(clienteId) {
      recibido = clienteId
      return { data: [{ id: 'p1' }], ids: ['p1'] }
    },
  })

  const response = await request(app).get('/api/cuenta/favoritos')

  assert.equal(response.status, 200)
  assert.equal(recibido, 'c1')
  assert.deepEqual(response.body.ids, ['p1'])
})

test('GET /ids devuelve solo los ids', async () => {
  const app = crearApp({
    async listarIds() { return ['p1', 'p2'] },
  })

  const response = await request(app).get('/api/cuenta/favoritos/ids')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.data, ['p1', 'p2'])
})

test('PUT /:productoId agrega y responde 204 con el clienteId de la sesión', async () => {
  let recibido
  const app = crearApp({
    async agregar(clienteId, productoId) { recibido = { clienteId, productoId } },
  })

  const response = await request(app).put('/api/cuenta/favoritos/p9')

  assert.equal(response.status, 204)
  assert.deepEqual(recibido, { clienteId: 'c1', productoId: 'p9' })
})

test('PUT /:productoId responde 404 si el producto no existe', async () => {
  const app = crearApp({
    async agregar() { throw new ErrorFavorito('PRODUCT_NOT_FOUND', 'No encontramos el producto.') },
  })

  const response = await request(app).put('/api/cuenta/favoritos/fantasma')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'PRODUCT_NOT_FOUND')
})

test('DELETE /:productoId quita y responde 204', async () => {
  let recibido
  const app = crearApp({
    async quitar(clienteId, productoId) { recibido = { clienteId, productoId } },
  })

  const response = await request(app).delete('/api/cuenta/favoritos/p9')

  assert.equal(response.status, 204)
  assert.deepEqual(recibido, { clienteId: 'c1', productoId: 'p9' })
})
