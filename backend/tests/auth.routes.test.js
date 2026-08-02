import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterAuth } from '../src/modules/auth/auth.routes.js'

function crearAppAuth(servicio) {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', crearRouterAuth(servicio))
  return app
}

test('POST /api/auth/login crea una cookie httpOnly y devuelve el usuario público', async () => {
  const app = crearAppAuth({
    async iniciarSesion() {
      return {
        token: 'token-de-prueba',
        expiraEn: new Date('2026-08-09T12:00:00.000Z'),
        usuario: { id: 'usuario-1', nombre: 'Wilnes', email: 'wilnes@example.test', rol: 'ADMIN' },
      }
    },
  })

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: ' WILNES@example.test ', contrasena: 'Clave-de-prueba-2026' })

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.data.usuario, {
    id: 'usuario-1',
    nombre: 'Wilnes',
    email: 'wilnes@example.test',
    rol: 'ADMIN',
  })
  assert.match(response.headers['set-cookie'][0], /sesion_admin=token-de-prueba/)
  assert.match(response.headers['set-cookie'][0], /HttpOnly/)
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/)
})

test('POST /api/auth/login no revela si una credencial es incorrecta', async () => {
  const app = crearAppAuth({ async iniciarSesion() { return null } })

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'wilnes@example.test', contrasena: 'incorrecta' })

  assert.equal(response.status, 401)
  assert.deepEqual(response.body, {
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Email o contraseña incorrectos.',
    },
  })
})
