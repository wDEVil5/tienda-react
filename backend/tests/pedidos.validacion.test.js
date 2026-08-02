import test from 'node:test'
import assert from 'node:assert/strict'
import { validarCotizacion, validarPedidoNuevo } from '../src/modules/pedidos/pedidos.validacion.js'

const productoId = '550e8400-e29b-41d4-a716-446655440000'
const otroProductoId = '550e8400-e29b-41d4-a716-446655440001'

const contacto = {
  nombre: 'Camila R.',
  email: 'camila@correo.cl',
  telefono: '+56 9 8765 4321',
}

const direccion = {
  calle: 'Av. Providencia 1234',
  comuna: 'Providencia',
  region: 'Región Metropolitana',
}

test('acepta un retiro válido sin dirección', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId, cantidad: 2 }],
  })

  assert.equal(resultado.success, true)
})

test('acepta un despacho válido con dirección', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'DESPACHO',
    direccion,
    items: [{ productoId, cantidad: 1 }],
  })

  assert.equal(resultado.success, true)
})

test('rechaza un despacho sin dirección', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'DESPACHO',
    items: [{ productoId, cantidad: 1 }],
  })

  assert.equal(resultado.success, false)
})

test('rechaza un retiro que trae dirección', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'RETIRO',
    direccion,
    items: [{ productoId, cantidad: 1 }],
  })

  assert.equal(resultado.success, false)
})

test('rechaza productos repetidos en los ítems', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'RETIRO',
    items: [
      { productoId, cantidad: 1 },
      { productoId, cantidad: 2 },
    ],
  })

  assert.equal(resultado.success, false)
})

test('rechaza un pedido sin ítems', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'RETIRO',
    items: [],
  })

  assert.equal(resultado.success, false)
})

test('rechaza montos enviados por el cliente (strict)', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId, cantidad: 1 }],
    total: 1,
  })

  assert.equal(resultado.success, false)
})

test('rechaza una cantidad no positiva', () => {
  const resultado = validarPedidoNuevo({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId: otroProductoId, cantidad: 0 }],
  })

  assert.equal(resultado.success, false)
})

test('cotización: acepta despacho con comuna y retiro sin comuna', () => {
  assert.equal(
    validarCotizacion({ modalidad: 'DESPACHO', comuna: 'Providencia', items: [{ productoId, cantidad: 1 }] }).success,
    true,
  )
  assert.equal(
    validarCotizacion({ modalidad: 'RETIRO', items: [{ productoId, cantidad: 1 }] }).success,
    true,
  )
})

test('cotización: no pide contacto y rechaza campos de más', () => {
  assert.equal(
    validarCotizacion({ modalidad: 'RETIRO', items: [{ productoId, cantidad: 1 }], total: 1 }).success,
    false,
  )
})
