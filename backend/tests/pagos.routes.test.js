import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterPagos } from '../src/modules/pagos/pagos.routes.js'
import { ErrorPago } from '../src/modules/pagos/pagos.service.js'

const UUID = '11111111-1111-4111-8111-111111111111'

function crearApp(servicio) {
  const app = express()
  app.use(express.json())
  app.use('/api/pagos', crearRouterPagos(servicio))
  return app
}

test('POST / inicia el pago y responde 201 con la URL', async () => {
  let recibido
  const app = crearApp({
    async iniciarPago(pedidoId) {
      recibido = pedidoId
      return { pagoId: 'pago1', referenciaExterna: 'ref-pago1', urlPago: 'http://pago/1' }
    },
  })

  const response = await request(app).post('/api/pagos').send({ pedidoId: UUID })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.urlPago, 'http://pago/1')
  assert.equal(recibido, UUID)
})

test('POST / responde 422 si el pedidoId no es un uuid', async () => {
  const app = crearApp({
    async iniciarPago() {
      throw new Error('no debería llamarse')
    },
  })

  const response = await request(app).post('/api/pagos').send({ pedidoId: 'no-uuid' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_PAYMENT_DATA')
})

test('POST / responde 404 si el pedido no existe', async () => {
  const app = crearApp({
    async iniciarPago() {
      throw new ErrorPago('ORDER_NOT_FOUND', 'No encontramos el pedido.')
    },
  })

  const response = await request(app).post('/api/pagos').send({ pedidoId: UUID })

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ORDER_NOT_FOUND')
})

test('POST / responde 409 si el pedido no es pagable', async () => {
  const app = crearApp({
    async iniciarPago() {
      throw new ErrorPago('ORDER_NOT_PAYABLE', 'El pedido no está pendiente de pago.')
    },
  })

  const response = await request(app).post('/api/pagos').send({ pedidoId: UUID })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'ORDER_NOT_PAYABLE')
})

test('POST / responde 409 si el pedido ya fue pagado', async () => {
  const app = crearApp({
    async iniciarPago() {
      throw new ErrorPago('ORDER_ALREADY_PAID', 'El pedido ya fue pagado.')
    },
  })

  const response = await request(app).post('/api/pagos').send({ pedidoId: UUID })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'ORDER_ALREADY_PAID')
})

test('POST /webhook siempre responde 200 y pasa el cuerpo al servicio', async () => {
  let recibido
  const app = crearApp({
    async procesarNotificacion(payload) {
      recibido = payload
      return { procesado: true, estado: 'APROBADO', aplicado: true }
    },
  })

  const response = await request(app)
    .post('/api/pagos/webhook')
    .send({ referenciaExterna: 'r1', estado: 'APROBADO' })

  assert.equal(response.status, 200)
  assert.equal(response.body.ok, true)
  assert.deepEqual(recibido, { referenciaExterna: 'r1', estado: 'APROBADO' })
})
