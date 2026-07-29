import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/health responde que la API está disponible', async () => {
  const response = await request(app).get('/api/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: true })
})
