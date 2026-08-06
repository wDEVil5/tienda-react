import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterRecuperacion } from '../src/modules/recuperacion/recuperacion.routes.js'
import { ErrorRecuperacion } from '../src/modules/recuperacion/recuperacion.service.js'
import { crearLimitadorIntentosLogin } from '../src/modules/auth/limite-intentos.js'

function crearServicioFalso({ lanzarEnRestablecer = null } = {}) {
  const llamadas = { solicitar: [], restablecer: [] }
  return {
    llamadas,
    async solicitar(args) {
      llamadas.solicitar.push(args)
    },
    async restablecer(args) {
      llamadas.restablecer.push(args)
      if (lanzarEnRestablecer) throw lanzarEnRestablecer
    },
  }
}

function crearApp(servicio, opciones = {}) {
  const app = express()
  app.use(express.json())
  app.use('/contrasena', crearRouterRecuperacion({ servicio, ...opciones }))
  return app
}

test('POST /recuperacion con correo válido responde 202 genérico y normaliza el email', async () => {
  const servicio = crearServicioFalso()
  const respuesta = await request(crearApp(servicio))
    .post('/contrasena/recuperacion')
    .send({ email: '  Ana@Correo.CL ' })

  assert.equal(respuesta.status, 202)
  assert.match(respuesta.body.data.mensaje, /Si el correo está registrado/)
  assert.deepEqual(servicio.llamadas.solicitar, [{ email: 'ana@correo.cl' }]) // trim + minúsculas
})

test('POST /recuperacion con correo inválido responde 422 y no llama al servicio', async () => {
  const servicio = crearServicioFalso()
  const respuesta = await request(crearApp(servicio))
    .post('/contrasena/recuperacion')
    .send({ email: 'no-es-correo' })

  assert.equal(respuesta.status, 422)
  assert.equal(respuesta.body.error.code, 'INVALID_RECOVERY_REQUEST')
  assert.equal(servicio.llamadas.solicitar.length, 0)
})

test('POST /restablecer válido responde 204 y pasa token + contraseña al servicio', async () => {
  const servicio = crearServicioFalso()
  const respuesta = await request(crearApp(servicio))
    .post('/contrasena/restablecer')
    .send({ token: 'abc', contrasenaNueva: 'ClaveLarga123' })

  assert.equal(respuesta.status, 204)
  assert.deepEqual(servicio.llamadas.restablecer, [{ token: 'abc', contrasenaNueva: 'ClaveLarga123' }])
})

test('POST /restablecer con contraseña corta responde 422', async () => {
  const servicio = crearServicioFalso()
  const respuesta = await request(crearApp(servicio))
    .post('/contrasena/restablecer')
    .send({ token: 'abc', contrasenaNueva: 'corta' })

  assert.equal(respuesta.status, 422)
  assert.equal(respuesta.body.error.code, 'INVALID_RESET_DATA')
  assert.equal(servicio.llamadas.restablecer.length, 0)
})

test('POST /restablecer con token inválido responde 400 INVALID_TOKEN', async () => {
  const servicio = crearServicioFalso({
    lanzarEnRestablecer: new ErrorRecuperacion('INVALID_TOKEN', 'El enlace no es válido o ya expiró.'),
  })
  const respuesta = await request(crearApp(servicio))
    .post('/contrasena/restablecer')
    .send({ token: 'malo', contrasenaNueva: 'ClaveLarga123' })

  assert.equal(respuesta.status, 400)
  assert.equal(respuesta.body.error.code, 'INVALID_TOKEN')
})

test('POST /recuperacion aplica rate-limit (429 tras el máximo)', async () => {
  const servicio = crearServicioFalso()
  const limitar = crearLimitadorIntentosLogin({ maxIntentos: 2, obtenerClave: () => 'fijo' })
  const app = crearApp(servicio, { limitar })

  await request(app).post('/contrasena/recuperacion').send({ email: 'a@a.cl' })
  await request(app).post('/contrasena/recuperacion').send({ email: 'a@a.cl' })
  const tercero = await request(app).post('/contrasena/recuperacion').send({ email: 'a@a.cl' })

  assert.equal(tercero.status, 429)
  assert.equal(tercero.body.error.code, 'TOO_MANY_LOGIN_ATTEMPTS')
})
