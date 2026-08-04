import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterCuenta } from '../src/modules/cuenta/cuenta.routes.js'
import { ErrorCuenta } from '../src/modules/cuenta/cuenta.service.js'

// Router de cuenta con servicio falso y el limitador desactivado, para probar la
// ruta (validación, cookies, códigos) sin base de datos ni rate-limit.
function crearApp(servicio) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/cuenta',
    crearRouterCuenta(servicio, { limitarLogin: (_request, _response, next) => next() }),
  )
  return app
}

test('POST /registro crea la cuenta y setea la cookie de cliente', async () => {
  const app = crearApp({
    async registrar() {
      return { token: 'tok', expiraEn: new Date(), cliente: { id: 'c1', email: 'w@c.cl' } }
    },
  })

  const response = await request(app)
    .post('/api/cuenta/registro')
    .send({ nombre: 'Wilnes', email: 'w@c.cl', contrasena: 'Cliente2026!' })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.cliente.email, 'w@c.cl')
  assert.match(response.headers['set-cookie'][0], /sesion_cliente=tok/)
})

test('POST /registro responde 422 ante datos inválidos', async () => {
  const app = crearApp({
    async registrar() {
      throw new Error('no debería llamarse')
    },
  })

  const response = await request(app)
    .post('/api/cuenta/registro')
    .send({ nombre: 'W', email: 'malo', contrasena: 'corta' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_ACCOUNT_DATA')
})

test('POST /registro responde 409 si el correo ya existe', async () => {
  const app = crearApp({
    async registrar() {
      throw new ErrorCuenta('EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.')
    },
  })

  const response = await request(app)
    .post('/api/cuenta/registro')
    .send({ nombre: 'Wilnes', email: 'w@c.cl', contrasena: 'Cliente2026!' })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'EMAIL_TAKEN')
})

test('POST /login responde 401 con credenciales incorrectas', async () => {
  const app = crearApp({ async iniciarSesion() { return null } })

  const response = await request(app)
    .post('/api/cuenta/login')
    .send({ email: 'w@c.cl', contrasena: 'otra-clave-larga' })

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS')
})

test('POST /login setea la cookie con credenciales válidas', async () => {
  const app = crearApp({
    async iniciarSesion() {
      return { token: 'tok', expiraEn: new Date(), cliente: { id: 'c1', email: 'w@c.cl' } }
    },
  })

  const response = await request(app)
    .post('/api/cuenta/login')
    .send({ email: 'w@c.cl', contrasena: 'Cliente2026!' })

  assert.equal(response.status, 200)
  assert.match(response.headers['set-cookie'][0], /sesion_cliente=tok/)
})

test('GET /api/cuenta exige sesión (401 sin cookie)', async () => {
  const app = crearApp({ async obtenerSesionActiva() { return null } })

  const response = await request(app).get('/api/cuenta')

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTH_REQUIRED')
})

test('GET /api/cuenta devuelve el cliente autenticado', async () => {
  const app = crearApp({
    async obtenerSesionActiva() {
      return { cliente: { id: 'c1', email: 'w@c.cl' } }
    },
  })

  const response = await request(app).get('/api/cuenta').set('Cookie', 'sesion_cliente=tok')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.cliente.id, 'c1')
})

test('PATCH /api/cuenta/perfil actualiza solo al cliente autenticado', async () => {
  let recibido = null
  const app = crearApp({
    async obtenerSesionActiva() {
      return { cliente: { id: 'c1', email: 'w@c.cl' } }
    },
    async actualizarPerfil(clienteId, datos) {
      recibido = { clienteId, datos }
      return { id: clienteId, email: 'w@c.cl', ...datos }
    },
  })

  const response = await request(app)
    .patch('/api/cuenta/perfil')
    .set('Cookie', 'sesion_cliente=tok')
    .send({ nombre: 'Wilnes A.', telefono: '+56 9 1234 5678' })

  assert.equal(response.status, 200)
  assert.deepEqual(recibido, {
    clienteId: 'c1',
    datos: { nombre: 'Wilnes A.', telefono: '+56 9 1234 5678' },
  })
})

test('PATCH /api/cuenta/perfil rechaza datos inválidos antes de llamar al servicio', async () => {
  const app = crearApp({
    async obtenerSesionActiva() {
      return { cliente: { id: 'c1' } }
    },
    async actualizarPerfil() {
      throw new Error('no debería llamarse')
    },
  })

  const response = await request(app)
    .patch('/api/cuenta/perfil')
    .set('Cookie', 'sesion_cliente=tok')
    .send({ nombre: 'W', telefono: '+56 9 1234 5678', email: 'ajeno@correo.cl' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_PROFILE_DATA')
})

test('PATCH /api/cuenta/contrasena cambia la clave del cliente autenticado', async () => {
  let recibido = null
  const app = crearApp({
    async obtenerSesionActiva() {
      return { cliente: { id: 'c1' } }
    },
    async cambiarContrasena(clienteId, datos, tokenSesion) {
      recibido = { clienteId, datos, tokenSesion }
    },
  })

  const response = await request(app)
    .patch('/api/cuenta/contrasena')
    .set('Cookie', 'sesion_cliente=tok')
    .send({ contrasenaActual: 'Cliente2026!', contrasenaNueva: 'Nueva clave segura 2026' })

  assert.equal(response.status, 204)
  assert.deepEqual(recibido, {
    clienteId: 'c1',
    datos: { contrasenaActual: 'Cliente2026!', contrasenaNueva: 'Nueva clave segura 2026' },
    tokenSesion: 'tok',
  })
})

test('PATCH /api/cuenta/contrasena rechaza la contraseña actual incorrecta', async () => {
  const app = crearApp({
    async obtenerSesionActiva() {
      return { cliente: { id: 'c1' } }
    },
    async cambiarContrasena() {
      throw new ErrorCuenta('INVALID_CURRENT_PASSWORD', 'La contraseña actual no es correcta.')
    },
  })

  const response = await request(app)
    .patch('/api/cuenta/contrasena')
    .set('Cookie', 'sesion_cliente=tok')
    .send({ contrasenaActual: 'mala', contrasenaNueva: 'Nueva clave segura 2026' })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_CURRENT_PASSWORD')
})

test('POST /logout revoca la sesión y limpia la cookie', async () => {
  let revocado = false
  const app = crearApp({
    async obtenerSesionActiva() {
      return { cliente: { id: 'c1' } }
    },
    async cerrarSesion() {
      revocado = true
    },
  })

  const response = await request(app).post('/api/cuenta/logout').set('Cookie', 'sesion_cliente=tok')

  assert.equal(response.status, 204)
  assert.equal(revocado, true)
})
