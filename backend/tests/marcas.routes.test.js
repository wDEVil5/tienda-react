import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/marcas devuelve marcas disponibles', async () => {
  const response = await request(app).get('/api/marcas')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 4)
  assert.equal(response.body.data[0].logoUrl, null)
})
