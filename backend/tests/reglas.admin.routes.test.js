import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterAdmin } from '../src/modules/admin/admin.routes.js'

// Router admin con sesión y servicio falsos: prueba permisos, validación y
// códigos de la ruta sin tocar la base de datos.
function crearApp(servicio, { rol = 'ADMIN' } = {}) {
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

const reglasValidas = {
  envioGratisDesde: 25000,
  tarifaBase: 3500,
  corteRetiroHoy: '20:00',
  preparacionHoras: 3,
  horarioEntrega: 'Sáb y Dom · 10:00 a 14:00',
  tarifasComuna: [{ nombre: 'Ñuñoa', tarifa: 1990, plazoHoras: 12 }],
}

test('GET /api/admin/reglas devuelve las reglas para editar', async () => {
  const app = crearApp({
    async obtenerReglas() {
      return { envioGratisDesde: 20000, tarifasComuna: [] }
    },
  })

  const response = await request(app).get('/api/admin/reglas')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.envioGratisDesde, 20000)
})

test('GET /api/admin/reglas queda vedado a un OPERADOR', async () => {
  const app = crearApp(
    { async obtenerReglas() { throw new Error('no debería llamarse') } },
    { rol: 'OPERADOR' },
  )

  const response = await request(app).get('/api/admin/reglas')

  assert.equal(response.status, 403)
})

test('PUT /api/admin/reglas guarda reglas válidas', async () => {
  let recibido
  const app = crearApp({
    async actualizarReglas(datos) {
      recibido = datos
      return { ...datos, tarifasComuna: [{ comuna: 'nunoa', nombre: 'Ñuñoa', tarifa: 1990, plazoHoras: 12 }] }
    },
  })

  const response = await request(app).put('/api/admin/reglas').send(reglasValidas)

  assert.equal(response.status, 200)
  assert.equal(recibido.envioGratisDesde, 25000)
  assert.equal(response.body.data.tarifasComuna[0].comuna, 'nunoa')
})

test('PUT /api/admin/reglas responde 422 ante datos inválidos', async () => {
  const app = crearApp({
    async actualizarReglas() {
      throw new Error('no debería llamarse')
    },
  })

  const response = await request(app)
    .put('/api/admin/reglas')
    .send({ ...reglasValidas, corteRetiroHoy: '99:99' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_STORE_RULES')
})
