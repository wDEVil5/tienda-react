import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterAvisos } from '../src/modules/avisos/avisos.routes.js'
import { ErrorAviso } from '../src/modules/avisos/avisos.service.js'

// Middleware de cliente falso: fija (o no) request.cliente para probar que la
// ruta enlaza el id de la sesión sin exigirla.
function crearApp(servicio, { cliente = null } = {}) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/avisos',
    crearRouterAvisos(servicio, {
      middlewareCliente: (request, _response, next) => {
        if (cliente) request.cliente = cliente
        next()
      },
    }),
  )
  return app
}

test('POST / crea el aviso y responde 201 con el correo normalizado', async () => {
  let recibido
  const app = crearApp(
    {
      async suscribir(entrada) {
        recibido = entrada
        return { id: 'a1', productoId: 'p1', email: entrada.email, creadoEn: new Date() }
      },
    },
    { cliente: { id: 'c1' } },
  )

  const response = await request(app)
    .post('/api/avisos')
    .send({ slug: 'leche-entera-1-l', email: 'ANA@Correo.CL' })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.email, 'ana@correo.cl')
  assert.equal(recibido.email, 'ana@correo.cl')
  assert.equal(recibido.slug, 'leche-entera-1-l')
  assert.equal(recibido.clienteId, 'c1')
})

test('POST / sin sesión suscribe igual con clienteId null', async () => {
  let recibido
  const app = crearApp({
    async suscribir(entrada) {
      recibido = entrada
      return { id: 'a1', productoId: 'p1', email: entrada.email, creadoEn: new Date() }
    },
  })

  const response = await request(app)
    .post('/api/avisos')
    .send({ slug: 'leche-entera-1-l', email: 'ana@correo.cl' })

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
    .post('/api/avisos')
    .send({ slug: 'leche-entera-1-l', email: 'no-es-correo' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_NOTICE_DATA')
})

test('POST / responde 409 si ya está suscrito', async () => {
  const app = crearApp({
    async suscribir() {
      throw new ErrorAviso('ALREADY_SUBSCRIBED', 'Ya te avisaremos.')
    },
  })

  const response = await request(app)
    .post('/api/avisos')
    .send({ slug: 'leche-entera-1-l', email: 'ana@correo.cl' })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'ALREADY_SUBSCRIBED')
})

test('POST / responde 409 si el producto tiene stock', async () => {
  const app = crearApp({
    async suscribir() {
      throw new ErrorAviso('PRODUCT_AVAILABLE', 'Este producto tiene stock disponible.')
    },
  })

  const response = await request(app)
    .post('/api/avisos')
    .send({ slug: 'leche-entera-1-l', email: 'ana@correo.cl' })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'PRODUCT_AVAILABLE')
})

test('POST / responde 404 si el producto no existe', async () => {
  const app = crearApp({
    async suscribir() {
      throw new ErrorAviso('PRODUCT_NOT_FOUND', 'No encontramos el producto solicitado.')
    },
  })

  const response = await request(app)
    .post('/api/avisos')
    .send({ slug: 'fantasma', email: 'ana@correo.cl' })

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'PRODUCT_NOT_FOUND')
})
