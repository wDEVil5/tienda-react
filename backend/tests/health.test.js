import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/health responde que la API está disponible', async () => {
  const response = await request(app).get('/api/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: true })
  assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/)
})

test('una ruta inexistente responde un error 404 legible', async () => {
  const response = await request(app).get('/api/no-existe')

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: {
      code: 'NOT_FOUND',
      message: 'No existe GET /api/no-existe',
    },
  })
})
