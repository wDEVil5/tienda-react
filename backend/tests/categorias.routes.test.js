import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/categorias devuelve categorías disponibles', async () => {
  const response = await request(app).get('/api/categorias')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 3)
  assert.equal(response.body.data[0].slug, 'despensa')
})
