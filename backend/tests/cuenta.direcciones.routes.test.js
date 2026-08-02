import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterDirecciones } from '../src/modules/cuenta/cuenta.direcciones.routes.js'

// Middleware de cliente falso: fija request.cliente, para probar que las rutas
// usan el clienteId de la SESIÓN (no del cuerpo) sin necesitar login real.
function crearApp(servicio) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/cuenta/direcciones',
    crearRouterDirecciones(servicio, {
      middlewareCliente: (request, _response, next) => {
        request.cliente = { id: 'c1' }
        next()
      },
    }),
  )
  return app
}

const direccion = { calle: 'Av. Uno 123', comuna: 'Ñuñoa', region: 'RM' }

test('GET / lista las direcciones del cliente', async () => {
  let recibido
  const app = crearApp({
    async listarDirecciones(clienteId) {
      recibido = clienteId
      return [{ id: 'd1' }]
    },
  })

  const response = await request(app).get('/api/cuenta/direcciones')

  assert.equal(response.status, 200)
  assert.equal(response.body.data[0].id, 'd1')
  assert.equal(recibido, 'c1')
})

test('POST / crea (201) usando el clienteId de la sesión, no del body', async () => {
  let recibido
  const app = crearApp({
    async crearDireccion(clienteId, datos) {
      recibido = { clienteId, datos }
      return { id: 'd1', ...datos }
    },
  })

  const response = await request(app).post('/api/cuenta/direcciones').send(direccion)

  assert.equal(response.status, 201)
  assert.equal(recibido.clienteId, 'c1')
})

test('POST / responde 422 con datos inválidos', async () => {
  const app = crearApp({ async crearDireccion() { throw new Error('no debería llamarse') } })

  const response = await request(app)
    .post('/api/cuenta/direcciones')
    .send({ calle: 'Av', comuna: 'Ñuñoa', region: 'RM' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_ADDRESS_DATA')
})

test('POST / rechaza un clienteId inyectado en el body (strict)', async () => {
  const app = crearApp({ async crearDireccion() { throw new Error('no debería llamarse') } })

  const response = await request(app)
    .post('/api/cuenta/direcciones')
    .send({ ...direccion, clienteId: 'otro-cliente' })

  assert.equal(response.status, 422)
})

test('PATCH /:id responde 200 al actualizar', async () => {
  const app = crearApp({
    async actualizarDireccion(clienteId, id) {
      return { id, clienteId }
    },
  })

  const response = await request(app).patch('/api/cuenta/direcciones/d1').send(direccion)

  assert.equal(response.status, 200)
  assert.equal(response.body.data.id, 'd1')
})

test('PATCH /:id responde 404 si la dirección no es del cliente', async () => {
  const app = crearApp({ async actualizarDireccion() { return null } })

  const response = await request(app).patch('/api/cuenta/direcciones/ajena').send(direccion)

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ADDRESS_NOT_FOUND')
})

test('DELETE /:id responde 204 al eliminar', async () => {
  const app = crearApp({ async eliminarDireccion() { return true } })

  const response = await request(app).delete('/api/cuenta/direcciones/d1')

  assert.equal(response.status, 204)
})

test('DELETE /:id responde 404 si no existe', async () => {
  const app = crearApp({ async eliminarDireccion() { return false } })

  const response = await request(app).delete('/api/cuenta/direcciones/fantasma')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ADDRESS_NOT_FOUND')
})
