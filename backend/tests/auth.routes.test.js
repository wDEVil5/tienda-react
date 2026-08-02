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

test('GET /api/auth/me devuelve el usuario de una sesión válida', async () => {
  const app = crearAppAuth({
    async obtenerSesionActiva(token) {
      return token === 'sesion-valida'
        ? { usuario: { id: 'usuario-1', nombre: 'Wilnes', email: 'wilnes@example.test', rol: 'ADMIN' } }
        : null
    },
  })

  const response = await request(app)
    .get('/api/auth/me')
    .set('Cookie', 'sesion_admin=sesion-valida')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.usuario.rol, 'ADMIN')
})

test('GET /api/auth/me rechaza una solicitud sin sesión', async () => {
  const app = crearAppAuth({ async obtenerSesionActiva() { return null } })

  const response = await request(app).get('/api/auth/me')

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTH_REQUIRED')
})

test('POST /api/auth/logout revoca la sesión y borra su cookie', async () => {
  let tokenRevocado
  const app = crearAppAuth({
    async obtenerSesionActiva() {
      return { usuario: { id: 'usuario-1', rol: 'ADMIN' } }
    },
    async cerrarSesion(token) {
      tokenRevocado = token
    },
  })

  const response = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', 'sesion_admin=sesion-valida')

  assert.equal(response.status, 204)
  assert.equal(tokenRevocado, 'sesion-valida')
  assert.match(response.headers['set-cookie'][0], /sesion_admin=;/)
})
