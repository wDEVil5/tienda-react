import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/marcas devuelve todas las marcas con su forma pública', async () => {
  const response = await request(app).get('/api/marcas')

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(response.body.data))
  // El seed crea varias marcas; ya no se filtran por "producto publicado", así
  // que no fijamos un número exacto (depende del estado de la base). Validamos la
  // forma pública de cada marca.
  assert.ok(response.body.data.length >= 1)
  for (const marca of response.body.data) {
    assert.equal(typeof marca.id, 'string')
    assert.equal(typeof marca.nombre, 'string')
    assert.equal(typeof marca.productCount, 'number')
    assert.ok('logoUrl' in marca)
  }
})
