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

test('GET /api/productos/:slug devuelve el detalle publicado', async () => {
  const response = await request(app).get('/api/productos/aceite-oliva-extra-virgen-500-ml')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.slug, 'aceite-oliva-extra-virgen-500-ml')
})

test('GET /api/productos/:slug responde 404 cuando el producto no está publicado', async () => {
  const response = await request(app).get('/api/productos/mermelada-de-frutilla-250-g')

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: {
      code: 'PRODUCT_NOT_FOUND',
      message: 'No encontramos el producto solicitado.',
    },
  })
})
