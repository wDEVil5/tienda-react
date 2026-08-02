import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

test('GET /api/reglas expone las reglas comerciales públicas', async () => {
  const response = await request(app).get('/api/reglas')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.envioGratisDesde, 20000)
  assert.equal(typeof response.body.data.tarifaBase, 'number')
  assert.equal(response.body.data.corteRetiroHoy, '19:00')
})

test('GET /api/reglas incluye las tarifas por comuna como lista', async () => {
  const response = await request(app).get('/api/reglas')

  assert.ok(Array.isArray(response.body.data.tarifasComuna))
  const providencia = response.body.data.tarifasComuna.find(
    (tarifa) => tarifa.comuna === 'providencia',
  )
  assert.equal(providencia.tarifa, 2990)
})
