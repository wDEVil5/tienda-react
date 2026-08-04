import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPagos, ErrorPago } from '../src/modules/pagos/pagos.service.js'

const PEDIDO_PENDIENTE = { id: 'ped1', numero: 5, estado: 'PENDIENTE', total: 15000 }

function crearRepositorioFalso(overrides = {}) {
  return {
    async obtenerPedidoParaPago() {
      return PEDIDO_PENDIENTE
    },
    async tienePagoAprobado() {
      return false
    },
    async crearPago(datos) {
      return { id: 'pago1', ...datos }
    },
    async fijarReferencia() {},
    ...overrides,
  }
}

function crearPasarelaFalsa() {
  return {
    proveedor: 'fake',
    async crearPreferencia({ pagoId }) {
      return { referenciaExterna: `ref-${pagoId}`, urlPago: `http://pago/${pagoId}` }
    },
  }
}

test('iniciarPago crea el pago, pide preferencia y devuelve la URL', async () => {
  let pagoCreado
  let referenciaFijada
  const servicio = crearServicioPagos({
    repositorio: crearRepositorioFalso({
      async crearPago(datos) {
        pagoCreado = datos
        return { id: 'pago1', ...datos }
      },
      async fijarReferencia(id, referencia) {
        referenciaFijada = { id, referencia }
      },
    }),
    pasarela: crearPasarelaFalsa(),
  })

  const resultado = await servicio.iniciarPago('ped1')

  assert.deepEqual(resultado, {
    pagoId: 'pago1',
    referenciaExterna: 'ref-pago1',
    urlPago: 'http://pago/pago1',
  })
  // El monto se congela desde el total del pedido, con el proveedor de la pasarela.
  assert.equal(pagoCreado.monto, 15000)
  assert.equal(pagoCreado.proveedor, 'fake')
  assert.deepEqual(referenciaFijada, { id: 'pago1', referencia: 'ref-pago1' })
})

test('iniciarPago falla con ORDER_NOT_FOUND si el pedido no existe', async () => {
  const servicio = crearServicioPagos({
    repositorio: crearRepositorioFalso({ async obtenerPedidoParaPago() { return null } }),
    pasarela: crearPasarelaFalsa(),
  })

  await assert.rejects(
    servicio.iniciarPago('fantasma'),
    (error) => error instanceof ErrorPago && error.code === 'ORDER_NOT_FOUND',
  )
})

test('iniciarPago falla con ORDER_NOT_PAYABLE si el pedido no está pendiente', async () => {
  const servicio = crearServicioPagos({
    repositorio: crearRepositorioFalso({
      async obtenerPedidoParaPago() {
        return { ...PEDIDO_PENDIENTE, estado: 'PREPARANDO' }
      },
    }),
    pasarela: crearPasarelaFalsa(),
  })

  await assert.rejects(
    servicio.iniciarPago('ped1'),
    (error) => error instanceof ErrorPago && error.code === 'ORDER_NOT_PAYABLE',
  )
})

test('iniciarPago falla con ORDER_ALREADY_PAID si ya hay un pago aprobado', async () => {
  const servicio = crearServicioPagos({
    repositorio: crearRepositorioFalso({ async tienePagoAprobado() { return true } }),
    pasarela: crearPasarelaFalsa(),
  })

  await assert.rejects(
    servicio.iniciarPago('ped1'),
    (error) => error instanceof ErrorPago && error.code === 'ORDER_ALREADY_PAID',
  )
})
