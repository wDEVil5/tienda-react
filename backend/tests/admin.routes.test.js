import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterAdmin } from '../src/modules/admin/admin.routes.js'

function crearAppAdmin({ producto = null, rol = 'ADMIN' } = {}) {
  const app = express()
  const middlewareSesion = (request, _response, next) => {
    request.usuario = { id: 'usuario-1', rol }
    next()
  }
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion,
    servicio: { async obtenerProductoParaEdicion() { return producto } },
  }))
  return app
}

test('GET /api/admin/productos/:id entrega datos para edición a un administrador', async () => {
  const response = await request(crearAppAdmin({ producto: { id: 'producto-1', activo: false } }))
    .get('/api/admin/productos/producto-1')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { data: { id: 'producto-1', activo: false } })
})

test('GET /api/admin/productos/:id informa cuando no existe', async () => {
  const response = await request(crearAppAdmin()).get('/api/admin/productos/producto-1')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ADMIN_PRODUCT_NOT_FOUND')
})

test('PATCH /api/admin/productos/:id valida y entrega el producto actualizado', async () => {
  let cambiosRecibidos
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async actualizarProducto(_id, cambios) {
        cambiosRecibidos = cambios
        return { id: 'producto-1', stock: cambios.stock }
      },
    },
  }))

  const response = await request(app)
    .patch('/api/admin/productos/producto-1')
    .send({ stock: 8 })

  assert.equal(response.status, 200)
  assert.equal(cambiosRecibidos.stock, 8)
  assert.deepEqual(response.body, { data: { id: 'producto-1', stock: 8 } })
})

test('PATCH /api/admin/productos/:id rechaza datos inválidos antes de guardar', async () => {
  const app = crearAppAdmin()

  const response = await request(app)
    .patch('/api/admin/productos/producto-1')
    .send({ stock: -1 })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_PRODUCT_DATA')
})
