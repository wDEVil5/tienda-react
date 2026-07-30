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

test('GET /api/productos filtra por búsqueda', async () => {
  const response = await request(app).get('/api/productos?q=detergente')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 1)
  assert.equal(response.body.data[0].slug, 'detergente-liquido-concentrado-3-l')
})

test('GET /api/productos filtra por categoría', async () => {
  const response = await request(app).get('/api/productos?categoria=lacteos')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 2)
  assert.equal(response.body.data.every((producto) => producto.categoria.slug === 'lacteos'), true)
})

test('GET /api/productos filtra ofertas vigentes', async () => {
  const response = await request(app).get('/api/productos?ofertas=true')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.length, 2)
  assert.equal(response.body.data.every((producto) => producto.precioAnterior !== null), true)
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
