import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ESTADO_INICIAL_PAGO,
  ESTADOS_PAGO,
  esEstadoPagoTerminal,
  esTransicionPagoValida,
  laAprobacionConsumeStock,
} from '../src/modules/pagos/pagos.estados.js'

test('un pago nace PENDIENTE', () => {
  assert.equal(ESTADO_INICIAL_PAGO, 'PENDIENTE')
  assert.deepEqual(ESTADOS_PAGO, ['PENDIENTE', 'APROBADO', 'RECHAZADO'])
})

test('desde PENDIENTE se puede aprobar o rechazar', () => {
  assert.equal(esTransicionPagoValida('PENDIENTE', 'APROBADO'), true)
  assert.equal(esTransicionPagoValida('PENDIENTE', 'RECHAZADO'), true)
})

test('los estados terminales no admiten salida', () => {
  assert.equal(esEstadoPagoTerminal('APROBADO'), true)
  assert.equal(esEstadoPagoTerminal('RECHAZADO'), true)
  assert.equal(esEstadoPagoTerminal('PENDIENTE'), false)
  assert.equal(esTransicionPagoValida('APROBADO', 'RECHAZADO'), false)
  assert.equal(esTransicionPagoValida('RECHAZADO', 'APROBADO'), false)
})

test('re-aplicar el mismo estado no es una transición válida (se trata como no-op)', () => {
  // El servicio del webhook usa esto: hacia === desde no es "válida", pero se
  // interpreta como idempotencia, no como error.
  assert.equal(esTransicionPagoValida('APROBADO', 'APROBADO'), false)
})

test('solo la aprobación consume stock', () => {
  assert.equal(laAprobacionConsumeStock('APROBADO'), true)
  assert.equal(laAprobacionConsumeStock('RECHAZADO'), false)
  assert.equal(laAprobacionConsumeStock('PENDIENTE'), false)
})
