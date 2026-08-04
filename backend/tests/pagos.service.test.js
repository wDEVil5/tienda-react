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

// --- Webhook: procesarNotificacion ---

function crearPasarelaWebhook(interpretacion) {
  return {
    proveedor: 'fake',
    async crearPreferencia() { return {} },
    interpretarNotificacion() { return interpretacion },
  }
}

test('procesarNotificacion aprobada llama a aprobarPagoTransaccional', async () => {
  let aprobadoId
  const servicio = crearServicioPagos({
    repositorio: {
      async buscarPorReferencia() { return { id: 'pago1', estado: 'PENDIENTE' } },
      async aprobarPagoTransaccional(id) { aprobadoId = id; return { aplicado: true, consumido: true } },
    },
    pasarela: crearPasarelaWebhook({ referenciaExterna: 'ref1', estado: 'APROBADO' }),
  })

  const r = await servicio.procesarNotificacion({})

  assert.equal(aprobadoId, 'pago1')
  assert.deepEqual(r, { procesado: true, estado: 'APROBADO', aplicado: true, consumido: true })
})

test('procesarNotificacion es idempotente si el pago ya está en el estado entrante', async () => {
  let aprobLlamado = false
  const servicio = crearServicioPagos({
    repositorio: {
      async buscarPorReferencia() { return { id: 'pago1', estado: 'APROBADO' } },
      async aprobarPagoTransaccional() { aprobLlamado = true },
    },
    pasarela: crearPasarelaWebhook({ referenciaExterna: 'ref1', estado: 'APROBADO' }),
  })

  const r = await servicio.procesarNotificacion({})

  assert.deepEqual(r, { procesado: true, idempotente: true })
  assert.equal(aprobLlamado, false)
})

test('procesarNotificacion rechazada llama a rechazarPagoTransaccional', async () => {
  let rechId
  const servicio = crearServicioPagos({
    repositorio: {
      async buscarPorReferencia() { return { id: 'pago1', estado: 'PENDIENTE' } },
      async rechazarPagoTransaccional(id) { rechId = id; return { aplicado: true } },
    },
    pasarela: crearPasarelaWebhook({ referenciaExterna: 'ref1', estado: 'RECHAZADO' }),
  })

  const r = await servicio.procesarNotificacion({})

  assert.equal(rechId, 'pago1')
  assert.deepEqual(r, { procesado: true, estado: 'RECHAZADO', aplicado: true })
})

test('procesarNotificacion ignora una notificación ilegible', async () => {
  const servicio = crearServicioPagos({
    repositorio: {},
    pasarela: crearPasarelaWebhook(null),
  })

  const r = await servicio.procesarNotificacion({})

  assert.deepEqual(r, { procesado: false, motivo: 'NOTIFICACION_INVALIDA' })
})

test('procesarNotificacion ignora si no encuentra el pago', async () => {
  const servicio = crearServicioPagos({
    repositorio: { async buscarPorReferencia() { return null } },
    pasarela: crearPasarelaWebhook({ referenciaExterna: 'x', estado: 'APROBADO' }),
  })

  const r = await servicio.procesarNotificacion({})

  assert.deepEqual(r, { procesado: false, motivo: 'PAGO_NO_ENCONTRADO' })
})

test('procesarNotificacion rechaza una transición inválida (pago ya terminal)', async () => {
  const servicio = crearServicioPagos({
    repositorio: { async buscarPorReferencia() { return { id: 'pago1', estado: 'RECHAZADO' } } },
    pasarela: crearPasarelaWebhook({ referenciaExterna: 'x', estado: 'APROBADO' }),
  })

  const r = await servicio.procesarNotificacion({})

  assert.deepEqual(r, { procesado: false, motivo: 'TRANSICION_INVALIDA' })
})
