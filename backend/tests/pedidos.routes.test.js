import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterPedidos } from '../src/modules/pedidos/pedidos.routes.js'
import { ErrorPedido } from '../src/modules/pedidos/pedidos.service.js'

function crearApp(servicio) {
  const app = express()
  app.use(express.json())
  app.use('/api/pedidos', crearRouterPedidos({ servicio }))
  return app
}

const contacto = {
  nombre: 'Camila R.',
  email: 'camila@correo.cl',
  telefono: '+56 9 8765 4321',
}
const productoId = '550e8400-e29b-41d4-a716-446655440000'

test('POST /api/pedidos crea el pedido y responde 201 con su contrato', async () => {
  let recibido
  const app = crearApp({
    async crearPedido(datos) {
      recibido = datos
      return {
        id: 'ped-1', numero: 7, estado: 'PENDIENTE', modalidad: 'RETIRO',
        contactoNombre: 'Camila R.', contactoEmail: 'camila@correo.cl',
        contactoTelefono: '+56 9 8765 4321',
        subtotal: 5490, descuento: 0, costoEnvio: 0, total: 5490,
        items: [{
          id: 'item-1', nombre: 'Café', sku: 'CAFE', cantidad: 1,
          precioNormal: 5490, precioFinal: 5490, subtotal: 5490,
        }],
        createdAt: new Date('2026-08-02T12:00:00.000Z'),
      }
    },
  })

  const response = await request(app)
    .post('/api/pedidos')
    .send({ contacto, modalidad: 'RETIRO', items: [{ productoId, cantidad: 1 }] })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.numero, 7)
  assert.equal(response.body.data.total, 5490)
  assert.equal(response.body.data.items[0].nombre, 'Café')
  // El contrato de salida no expone ids internos de ítem.
  assert.equal('id' in response.body.data.items[0], false)
  assert.equal(recibido.modalidad, 'RETIRO')
})

test('POST /api/pedidos responde 422 ante datos inválidos', async () => {
  const app = crearApp({
    async crearPedido() {
      throw new Error('no debería llamarse cuando la validación falla')
    },
  })

  const response = await request(app)
    .post('/api/pedidos')
    .send({ modalidad: 'RETIRO', items: [] })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_ORDER_DATA')
})

test('POST /api/pedidos responde 409 cuando no hay stock', async () => {
  const app = crearApp({
    async crearPedido() {
      throw new ErrorPedido('INSUFFICIENT_STOCK', 'No hay stock suficiente de Café.')
    },
  })

  const response = await request(app)
    .post('/api/pedidos')
    .send({ contacto, modalidad: 'RETIRO', items: [{ productoId, cantidad: 99 }] })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'INSUFFICIENT_STOCK')
})

test('POST /api/pedidos responde 409 si un producto no está disponible', async () => {
  const app = crearApp({
    async crearPedido() {
      throw new ErrorPedido('PRODUCT_NOT_AVAILABLE', 'Uno de los productos ya no está disponible.')
    },
  })

  const response = await request(app)
    .post('/api/pedidos')
    .send({ contacto, modalidad: 'RETIRO', items: [{ productoId, cantidad: 1 }] })

  assert.equal(response.status, 409)
  assert.equal(response.body.error.code, 'PRODUCT_NOT_AVAILABLE')
})
