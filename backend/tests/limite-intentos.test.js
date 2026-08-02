import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearLimitadorIntentosLogin } from '../src/modules/auth/limite-intentos.js'

test('el limitador bloquea el sexto intento dentro de quince minutos', async () => {
  let tiempo = 0
  const app = express()
  app.post('/login', crearLimitadorIntentosLogin({
    ahora: () => tiempo,
    obtenerClave: () => 'ip-prueba',
  }), (_request, response) => response.status(204).end())

  for (let intento = 0; intento < 5; intento += 1) {
    const response = await request(app).post('/login')
    assert.equal(response.status, 204)
  }

  const bloqueado = await request(app).post('/login')

  assert.equal(bloqueado.status, 429)
  assert.equal(bloqueado.body.error.code, 'TOO_MANY_LOGIN_ATTEMPTS')
  assert.equal(bloqueado.headers['retry-after'], '900')
})

test('el limitador permite intentos cuando termina la ventana', async () => {
  let tiempo = 0
  const app = express()
  app.post('/login', crearLimitadorIntentosLogin({
    maxIntentos: 1,
    ventanaMs: 1000,
    ahora: () => tiempo,
    obtenerClave: () => 'ip-prueba',
  }), (_request, response) => response.status(204).end())

  await request(app).post('/login')
  assert.equal((await request(app).post('/login')).status, 429)

  tiempo = 1000
  assert.equal((await request(app).post('/login')).status, 204)
})
