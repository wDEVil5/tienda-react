import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterNewsletter } from '../src/modules/newsletter/newsletter.routes.js'
import { ErrorNewsletter } from '../src/modules/newsletter/newsletter.service.js'

// Middleware de cliente falso: fija (o no) request.cliente para probar que la
// ruta enlaza el id de la sesión sin exigirla.
function crearApp(servicio, { cliente = null } = {}) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/newsletter',
    crearRouterNewsletter(servicio, {
      middlewareCliente: (request, _response, next) => {
        if (cliente) request.cliente = cliente
        next()
      },
    }),
  )
  return app
}

test('POST / suscribe y responde 201 con el correo normalizado', async () => {
  let recibido
  const app = crearApp(
    {
      async suscribir(entrada) {
        recibido = entrada
        return { id: 's1', email: entrada.email, estado: 'ACTIVO' }
      },
    },
    { cliente: { id: 'c1' } },
  )

  const response = await request(app)
    .post('/api/newsletter')
    .send({ email: 'ANA@Correo.CL' })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.email, 'ana@correo.cl')
  assert.equal(recibido.email, 'ana@correo.cl')
  assert.equal(recibido.clienteId, 'c1')
})

test('POST / sin sesión suscribe igual con clienteId null', async () => {
  let recibido
  const app = crearApp({
    async suscribir(entrada) {
      recibido = entrada
      return { id: 's1', email: entrada.email, estado: 'ACTIVO' }
    },
  })

  const response = await request(app)
    .post('/api/newsletter')
    .send({ email: 'ana@correo.cl' })

  assert.equal(response.status, 201)
  assert.equal(recibido.clienteId, null)
})

test('POST / responde 422 con un correo inválido', async () => {
  const app = crearApp({
    async suscribir() {
      throw new Error('no debería llamarse')
    },
  })

  const response = await request(app)
    .post('/api/newsletter')
    .send({ email: 'no-es-correo' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_SUBSCRIPTION_DATA')
})

test('POST / responde 409 si el correo ya está suscrito', async () => {
  const app = crearApp({
    async suscribir() {
      throw new ErrorNewsletter('ALREADY_SUBSCRIBED', 'Este correo ya está suscrito.')
    },
  })

  const response = await request(app)
    .post('/api/newsletter')
    .send({ email: 'ana@correo.cl' })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'ALREADY_SUBSCRIBED')
})
