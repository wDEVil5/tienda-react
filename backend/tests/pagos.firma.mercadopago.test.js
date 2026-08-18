import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { verificarFirmaMercadoPago } from '../src/modules/pagos/pagos.firma.mercadopago.js'

const SECRET = 'clave-webhook-de-prueba'

// Reproduce el manifest de MP y calcula la firma esperada, como haría el proveedor.
function firmar({ dataId, xRequestId, ts = '1700000000' }) {
  const idNormalizado = typeof dataId === 'string' ? dataId.toLowerCase() : dataId
  let manifest = ''
  if (idNormalizado) manifest += `id:${idNormalizado};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`
  const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex')
  return { xSignature: `ts=${ts},v1=${v1}`, ts }
}

test('acepta una firma válida', () => {
  const dataId = 'ABC123'
  const xRequestId = 'req-1'
  const { xSignature } = firmar({ dataId, xRequestId })

  const resultado = verificarFirmaMercadoPago({ xSignature, xRequestId, dataId, secret: SECRET })

  assert.equal(resultado.ok, true)
})

test('rechaza una firma con hash que no coincide', () => {
  const dataId = '123'
  const xRequestId = 'req-1'
  const { ts } = firmar({ dataId, xRequestId })
  const xSignature = `ts=${ts},v1=${'0'.repeat(64)}`

  const resultado = verificarFirmaMercadoPago({ xSignature, xRequestId, dataId, secret: SECRET })

  assert.equal(resultado.ok, false)
  assert.equal(resultado.motivo, 'no-coincide')
})

test('rechaza si el data.id no corresponde al firmado (aviso manipulado)', () => {
  const xRequestId = 'req-1'
  const { xSignature } = firmar({ dataId: '111', xRequestId })

  // Misma firma pero con otro id: no debe validar.
  const resultado = verificarFirmaMercadoPago({ xSignature, xRequestId, dataId: '999', secret: SECRET })

  assert.equal(resultado.ok, false)
})

test('sin clave configurada no bloquea (dev/local)', () => {
  const resultado = verificarFirmaMercadoPago({ xSignature: undefined, dataId: '1', secret: undefined })

  assert.equal(resultado.ok, true)
  assert.equal(resultado.motivo, 'sin-secreto')
})

test('con clave pero sin cabecera de firma, rechaza', () => {
  const resultado = verificarFirmaMercadoPago({ xSignature: undefined, dataId: '1', secret: SECRET })

  assert.equal(resultado.ok, false)
  assert.equal(resultado.motivo, 'falta-firma')
})

test('rechaza una x-signature malformada', () => {
  const resultado = verificarFirmaMercadoPago({ xSignature: 'basura-sin-ts-ni-v1', dataId: '1', secret: SECRET })

  assert.equal(resultado.ok, false)
  assert.equal(resultado.motivo, 'firma-malformada')
})
