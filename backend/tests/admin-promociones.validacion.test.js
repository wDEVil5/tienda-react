import test from 'node:test'
import assert from 'node:assert/strict'
import { validarPromocionNuevaAdmin } from '../src/modules/admin/admin-promociones.validacion.js'

const productoId = '550e8400-e29b-41d4-a716-446655440000'

test('acepta una campaña nueva con fechas y productos válidos', () => {
  const resultado = validarPromocionNuevaAdmin({
    nombre: 'Ofertas de agosto', porcentajeDescuento: 25,
    empiezaEn: '2026-08-01T00:00:00.000Z', terminaEn: '2026-08-08T00:00:00.000Z',
    productoIds: [productoId],
  })

  assert.equal(resultado.success, true)
})

test('rechaza una campaña sin productos o con fechas invertidas', () => {
  const resultado = validarPromocionNuevaAdmin({
    nombre: 'Ofertas de agosto', porcentajeDescuento: 25,
    empiezaEn: '2026-08-08T00:00:00.000Z', terminaEn: '2026-08-01T00:00:00.000Z',
    productoIds: [],
  })

  assert.equal(resultado.success, false)
})
