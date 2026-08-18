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

test('obtenerEstadoParaCheckout delega el snapshot del pago al repositorio', async () => {
  let pagoConsultado
  const servicio = crearServicioPagos({
    repositorio: {
      async obtenerEstadoParaCheckout(pagoId) {
        pagoConsultado = pagoId
        return { id: pagoId, estado: 'PENDIENTE' }
      },
    },
    pasarela: crearPasarelaFalsa(),
  })

  const resultado = await servicio.obtenerEstadoParaCheckout('pago-1')

  assert.equal(pagoConsultado, 'pago-1')
  assert.deepEqual(resultado, { id: 'pago-1', estado: 'PENDIENTE' })
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

test('procesarNotificacion aprobada envía la confirmación del pedido y NO la filtra en la respuesta', async () => {
  let pedidoConfirmado = null
  const servicio = crearServicioPagos({
    repositorio: {
      async buscarPorReferencia() { return { id: 'pago1', estado: 'PENDIENTE' } },
      async aprobarPagoTransaccional() {
        return { aplicado: true, consumido: true, pedido: { numero: 7, contactoEmail: 'ana@correo.cl', items: [] } }
      },
    },
    pasarela: crearPasarelaWebhook({ referenciaExterna: 'ref1', estado: 'APROBADO' }),
    notificador: { async enviarConfirmacion(pedido) { pedidoConfirmado = pedido } },
  })

  const r = await servicio.procesarNotificacion({})

  assert.equal(pedidoConfirmado?.numero, 7)
  assert.equal(r.pedido, undefined)
})

test('procesarNotificacion NO envía confirmación si el pedido no avanzó (idempotente)', async () => {
  let enviada = false
  const servicio = crearServicioPagos({
    repositorio: {
      async buscarPorReferencia() { return { id: 'pago1', estado: 'PENDIENTE' } },
      async aprobarPagoTransaccional() { return { aplicado: false, motivo: 'YA_PROCESADO' } },
    },
    pasarela: crearPasarelaWebhook({ referenciaExterna: 'ref1', estado: 'APROBADO' }),
    notificador: { async enviarConfirmacion() { enviada = true } },
  })

  await servicio.procesarNotificacion({})

  assert.equal(enviada, false)
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

// --- Reconciliación del retorno: reconciliarPago ---

test('reconciliarPago consulta la pasarela y aprueba cuando el pago sigue pendiente', async () => {
  let aprobadoId
  const servicio = crearServicioPagos({
    repositorio: {
      async obtenerReferenciaYEstado() {
        return { id: 'pago1', estado: 'PENDIENTE', referenciaExterna: 'ref1' }
      },
      async buscarPorReferencia() { return { id: 'pago1', estado: 'PENDIENTE' } },
      async aprobarPagoTransaccional(id) { aprobadoId = id; return { aplicado: true, consumido: true } },
    },
    pasarela: {
      proveedor: 'mercadopago',
      async consultarPorReferencia(ref) {
        return ref === 'ref1' ? { referenciaExterna: 'ref1', estado: 'APROBADO' } : null
      },
    },
    notificador: { async enviarConfirmacion() {} },
  })

  const r = await servicio.reconciliarPago('pago1')

  assert.equal(aprobadoId, 'pago1')
  assert.equal(r.estado, 'APROBADO')
})

test('reconciliarPago es no-op si el pago ya está terminal (no consulta a la pasarela)', async () => {
  let consultada = false
  const servicio = crearServicioPagos({
    repositorio: {
      async obtenerReferenciaYEstado() {
        return { id: 'pago1', estado: 'APROBADO', referenciaExterna: 'ref1' }
      },
    },
    pasarela: {
      proveedor: 'mercadopago',
      async consultarPorReferencia() { consultada = true; return null },
    },
  })

  const r = await servicio.reconciliarPago('pago1')

  assert.deepEqual(r, { procesado: true, idempotente: true, estado: 'APROBADO' })
  assert.equal(consultada, false)
})

test('reconciliarPago no hace nada si la pasarela no devuelve resultado', async () => {
  const servicio = crearServicioPagos({
    repositorio: {
      async obtenerReferenciaYEstado() {
        return { id: 'pago1', estado: 'PENDIENTE', referenciaExterna: 'ref1' }
      },
    },
    pasarela: {
      proveedor: 'fake',
      async consultarPorReferencia() { return null },
    },
  })

  const r = await servicio.reconciliarPago('pago1')

  assert.deepEqual(r, { procesado: false, motivo: 'SIN_RESULTADO' })
})

test('reconciliarPago no soporta pasarela sin consulta (falsa)', async () => {
  const servicio = crearServicioPagos({
    repositorio: {
      async obtenerReferenciaYEstado() {
        return { id: 'pago1', estado: 'PENDIENTE', referenciaExterna: 'ref1' }
      },
    },
    pasarela: { proveedor: 'fake' },
  })

  const r = await servicio.reconciliarPago('pago1')

  assert.deepEqual(r, { procesado: false, motivo: 'NO_SOPORTADO' })
})
