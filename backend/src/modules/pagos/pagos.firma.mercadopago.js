import crypto from 'node:crypto'

// Verificación de la firma del webhook de Mercado Pago (cabecera `x-signature`).
//
// MP firma un "manifest" con HMAC-SHA256 y la clave secreta del webhook (panel de
// MP → Webhooks). El manifest tiene la forma, omitiendo las partes ausentes:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// donde `ts` y `v1` (el hash) vienen dentro de `x-signature`: "ts=...,v1=...".
//
// Verificar la firma es defensa en profundidad: aunque el estado real siempre se
// reconsulta a la API de MP con nuestro token, así rechazamos avisos no auténticos
// ANTES de gastar una llamada a su API.

// Separa "ts=123,v1=abc" en { ts: '123', v1: 'abc' }.
function parsearFirma(xSignature) {
  return Object.fromEntries(
    String(xSignature)
      .split(',')
      .map((parte) => {
        const [clave, valor] = parte.split('=')
        return [clave?.trim(), valor?.trim()]
      }),
  )
}

// Comparación en tiempo constante: evita filtrar información por el tiempo de
// respuesta (timing attack) al validar el hash.
function iguales(a, b) {
  const bufferA = Buffer.from(String(a))
  const bufferB = Buffer.from(String(b))
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)
}

/**
 * Verifica la firma. Devuelve `{ ok, motivo }`.
 * - Sin `secret` configurado → `ok: true` (no bloquea; útil en local/dev sin la clave).
 * - Con `secret` → exige que `x-signature` sea válida para el `dataId`/`xRequestId`.
 */
export function verificarFirmaMercadoPago({ xSignature, xRequestId, dataId, secret } = {}) {
  if (!secret) return { ok: true, motivo: 'sin-secreto' }
  if (!xSignature) return { ok: false, motivo: 'falta-firma' }

  const { ts, v1 } = parsearFirma(xSignature)
  if (!ts || !v1) return { ok: false, motivo: 'firma-malformada' }

  // MP normaliza el id a minúsculas cuando es alfanumérico.
  const idNormalizado = typeof dataId === 'string' ? dataId.toLowerCase() : dataId

  let manifest = ''
  if (idNormalizado !== undefined && idNormalizado !== null && idNormalizado !== '') {
    manifest += `id:${idNormalizado};`
  }
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return iguales(esperado, v1)
    ? { ok: true, motivo: 'ok' }
    : { ok: false, motivo: 'no-coincide' }
}
