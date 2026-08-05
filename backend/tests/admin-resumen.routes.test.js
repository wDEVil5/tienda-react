import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterAdmin } from '../src/modules/admin/admin.routes.js'

// Router admin con sesión y servicio falsos, para probar la ruta (permisos,
// validación, códigos) sin tocar la base de datos.
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

test('GET /api/admin/resumen entrega el tablero con el período por defecto', async () => {
  let recibido
  const app = crearApp({
    async obtenerResumen(opciones) {
      recibido = opciones
      return { periodo: 'mes', ventas: { actual: 20860 } }
    },
  })

  const response = await request(app).get('/api/admin/resumen')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.ventas.actual, 20860)
  assert.equal(recibido.periodo, 'mes')
})

test('GET /api/admin/resumen acepta un período válido', async () => {
  let recibido
  const app = crearApp({
    async obtenerResumen(opciones) {
      recibido = opciones
      return { periodo: opciones.periodo }
    },
  })

  const response = await request(app).get('/api/admin/resumen?periodo=semana')

  assert.equal(response.status, 200)
  assert.equal(recibido.periodo, 'semana')
})

test('GET /api/admin/resumen rechaza un período inválido', async () => {
  const app = crearApp({ async obtenerResumen() { return {} } })

  const response = await request(app).get('/api/admin/resumen?periodo=decada')

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_QUERY_PARAM')
})
