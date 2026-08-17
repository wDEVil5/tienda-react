import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterResenas } from '../src/modules/resenas/resenas.routes.js'
import { ErrorResena } from '../src/modules/resenas/resenas.service.js'

const PRODUCTO = '11111111-1111-4111-8111-111111111111'
const RESENA = '33333333-3333-4333-8333-333333333333'

// App con middlewares falsos: sesión fija (cliente c1) para las rutas protegidas
// y sesión opcional presente para la lista.
function crearApp(servicio, { conSesion = true } = {}) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/resenas',
    crearRouterResenas(servicio, {
      middlewareCliente: (request, response, next) => {
        if (!conSesion) {
          return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Inicia sesión.' } })
        }
        request.cliente = { id: 'c1' }
        return next()
      },
      middlewareOpcional: (request, _response, next) => {
        if (conSesion) request.cliente = { id: 'c1' }
        return next()
      },
    }),
  )
  return app
}

test('GET / valida el productoId (400 si no es UUID)', async () => {
  const app = crearApp({ async listar() { throw new Error('no debe llamarse') } })
  const response = await request(app).get('/api/resenas?productoId=abc')
  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_QUERY_PARAM')
})

test('GET / devuelve la lista y pasa el clienteId de la sesión opcional', async () => {
  let recibido
  const app = crearApp({
    async listar(args) {
      recibido = args
      return { data: [{ id: 'r1', autor: 'Ana', esMia: true }], meta: { promedio: 3.4, conteo: 5 } }
    },
  })

  const response = await request(app).get(`/api/resenas?productoId=${PRODUCTO}&orden=mejor`)

  assert.equal(response.status, 200)
  assert.equal(recibido.clienteId, 'c1')
  assert.equal(recibido.orden, 'mejor')
  assert.equal(response.body.meta.promedio, 3.4)
})

test('GET /mia requiere sesión y devuelve elegibilidad + reseña', async () => {
  const app = crearApp({
    async estadoParaCliente() { return { puedeResenar: true, resena: { id: 'r1' } } },
  })

  const response = await request(app).get(`/api/resenas/mia?productoId=${PRODUCTO}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.data.puedeResenar, true)
})

test('POST / responde 422 si la calificación es inválida', async () => {
  const app = crearApp({ async guardar() { throw new Error('no debe llamarse') } })
  const response = await request(app).post('/api/resenas').send({ productoId: PRODUCTO, calificacion: 9 })
  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_REVIEW_DATA')
})

test('POST / crea la reseña (201) con el clienteId de la sesión', async () => {
  let recibido
  const app = crearApp({
    async guardar(datos) { recibido = datos; return { id: 'r9', calificacion: datos.calificacion } },
  })

  const response = await request(app)
    .post('/api/resenas')
    .send({ productoId: PRODUCTO, calificacion: 5, titulo: 'Genial' })

  assert.equal(response.status, 201)
  assert.equal(recibido.clienteId, 'c1')
  assert.equal(response.body.data.id, 'r9')
})

test('POST / responde 403 PURCHASE_REQUIRED si no compró', async () => {
  const app = crearApp({
    async guardar() { throw new ErrorResena('PURCHASE_REQUIRED', 'Solo puedes reseñar productos que compraste.') },
  })

  const response = await request(app).post('/api/resenas').send({ productoId: PRODUCTO, calificacion: 5 })

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'PURCHASE_REQUIRED')
})

test('DELETE /:id borra la propia (204) y 404 si no existe', async () => {
  const appOk = crearApp({ async eliminarPropia() { return { eliminada: true } } })
  assert.equal((await request(appOk).delete(`/api/resenas/${RESENA}`)).status, 204)

  const appNo = crearApp({ async eliminarPropia() { return { eliminada: false } } })
  const response = await request(appNo).delete(`/api/resenas/${RESENA}`)
  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'REVIEW_NOT_FOUND')
})
