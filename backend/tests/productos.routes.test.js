import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/productos devuelve productos publicados', async () => {
  const response = await request(app).get('/api/productos')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 5)
  assert.equal(response.body.data.every((producto) => !('activo' in producto)), true)
})
