import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterPagos } from '../src/modules/pagos/pagos.routes.js'
import { ErrorPago } from '../src/modules/pagos/pagos.service.js'

const UUID = '11111111-1111-4111-8111-111111111111'

function crearApp(servicio, verificarFirma) {
  const app = express()
  app.use(express.json())
  app.use('/api/pagos', crearRouterPagos(servicio, verificarFirma))
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

test('GET /:pagoId expone el estado persistido para el retorno del checkout', async () => {
  const app = crearApp({
    async obtenerEstadoParaCheckout(pagoId) {
      return {
        id: pagoId,
        estado: 'APROBADO',
        proveedor: 'mercadopago',
        pedido: { id: UUID, numero: 1043, estado: 'PREPARANDO', total: 20460 },
      }
    },
  })

  const response = await request(app).get(`/api/pagos/${UUID}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.data.estado, 'APROBADO')
  assert.equal(response.body.data.pedido.numero, 1043)
})

test('GET /:pagoId responde 404 para un id inválido o inexistente', async () => {
  const app = crearApp({
    async obtenerEstadoParaCheckout() {
      return null
    },
  })

  const invalido = await request(app).get('/api/pagos/no-es-uuid')
  const inexistente = await request(app).get(`/api/pagos/${UUID}`)

  assert.equal(invalido.status, 404)
  assert.equal(inexistente.status, 404)
  assert.equal(inexistente.body.error.code, 'PAYMENT_NOT_FOUND')
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

test('POST /webhook responde 401 y NO procesa si la firma es inválida', async () => {
  let llamado = false
  const app = crearApp(
    {
      async procesarNotificacion() {
        llamado = true
        return { procesado: true }
      },
    },
    () => ({ ok: false, motivo: 'no-coincide' }),
  )

  const response = await request(app).post('/api/pagos/webhook').send({ data: { id: '123' } })

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'INVALID_WEBHOOK_SIGNATURE')
  assert.equal(llamado, false)
})

test('POST /webhook procesa cuando la firma es válida', async () => {
  let llamado = false
  const app = crearApp(
    {
      async procesarNotificacion() {
        llamado = true
        return { procesado: true, estado: 'APROBADO', aplicado: true }
      },
    },
    () => ({ ok: true, motivo: 'ok' }),
  )

  const response = await request(app).post('/api/pagos/webhook').send({ data: { id: '123' } })

  assert.equal(response.status, 200)
  assert.equal(response.body.ok, true)
  assert.equal(llamado, true)
})
