import test from 'node:test'
import assert from 'node:assert/strict'
import { crearPasarelaMercadoPago } from '../src/modules/pagos/pagos.pasarela.mercadopago.js'

test('crearPreferencia llama a MP con el token, el monto y el external_reference', async () => {
  let capturado
  const fetchImpl = async (url, opciones) => {
    capturado = { url, opciones, body: JSON.parse(opciones.body) }
    return { ok: true, async json() { return { init_point: 'https://mp/checkout/123', id: 'pref1' } } }
  }
  const pasarela = crearPasarelaMercadoPago({
    accessToken: 'TEST-123',
    urlBase: 'https://sumarketexpress.pages.dev',
    fetchImpl,
  })

  const resultado = await pasarela.crearPreferencia({ pagoId: 'pago1', pedidoNumero: 7, monto: 15000 })

  assert.deepEqual(resultado, { referenciaExterna: 'pago1', urlPago: 'https://mp/checkout/123' })
  assert.equal(capturado.url, 'https://api.mercadopago.com/checkout/preferences')
  assert.equal(capturado.opciones.headers.Authorization, 'Bearer TEST-123')
  assert.equal(capturado.body.external_reference, 'pago1')
  assert.equal(capturado.body.items[0].unit_price, 15000)
  assert.equal(capturado.body.items[0].currency_id, 'CLP')
  assert.equal(capturado.body.auto_return, 'approved')
  assert.deepEqual(capturado.body.back_urls, {
    success: 'https://sumarketexpress.pages.dev/?checkout_return=success',
    failure: 'https://sumarketexpress.pages.dev/?checkout_return=failure',
    pending: 'https://sumarketexpress.pages.dev/?checkout_return=pending',
  })
})

test('crearPreferencia incluye notification_url solo si está configurada', async () => {
  let cuerpoCon
  let cuerpoSin
  const fetchImpl = (destino) => async (_url, opciones) => {
    destino.body = JSON.parse(opciones.body)
    return { ok: true, async json() { return { init_point: 'https://mp/x' } } }
  }

  const con = crearPasarelaMercadoPago({
    accessToken: 'x',
    notificationUrl: 'https://tunel.ngrok.app/api/pagos/webhook',
    fetchImpl: fetchImpl((cuerpoCon = {})),
  })
  await con.crearPreferencia({ pagoId: 'p', pedidoNumero: 1, monto: 100 })
  assert.equal(cuerpoCon.body.notification_url, 'https://tunel.ngrok.app/api/pagos/webhook')

  // null (no undefined) evita el parámetro por defecto que leería MP_WEBHOOK_URL
  // del entorno: así el caso "sin URL" es determinista, corra donde corra.
  const sin = crearPasarelaMercadoPago({
    accessToken: 'x',
    notificationUrl: null,
    fetchImpl: fetchImpl((cuerpoSin = {})),
  })
  await sin.crearPreferencia({ pagoId: 'p', pedidoNumero: 1, monto: 100 })
  assert.equal('notification_url' in cuerpoSin.body, false)
})

test('crearPreferencia no pide retorno automático con una URL local', async () => {
  let cuerpo
  const pasarela = crearPasarelaMercadoPago({
    accessToken: 'x',
    urlBase: 'http://localhost:5173',
    fetchImpl: async (_url, opciones) => {
      cuerpo = JSON.parse(opciones.body)
      return { ok: true, async json() { return { init_point: 'https://mp/x' } } }
    },
  })

  await pasarela.crearPreferencia({ pagoId: 'pago-local', pedidoNumero: 1, monto: 100 })

  assert.equal('auto_return' in cuerpo, false)
  assert.equal(cuerpo.back_urls.success, 'http://localhost:5173/?checkout_return=success')
})

test('interpretarNotificacion consulta el pago y mapea approved -> APROBADO', async () => {
  let rutaConsultada
  const fetchImpl = async (url) => {
    rutaConsultada = url
    return { ok: true, async json() { return { status: 'approved', external_reference: 'pago1' } } }
  }
  const pasarela = crearPasarelaMercadoPago({ accessToken: 'x', fetchImpl })

  const resultado = await pasarela.interpretarNotificacion({ type: 'payment', data: { id: '999' } })

  assert.deepEqual(resultado, { referenciaExterna: 'pago1', estado: 'APROBADO' })
  assert.equal(rutaConsultada, 'https://api.mercadopago.com/v1/payments/999')
})

test('interpretarNotificacion mapea rejected -> RECHAZADO', async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() { return { status: 'rejected', external_reference: 'pago1' } },
  })
  const pasarela = crearPasarelaMercadoPago({ accessToken: 'x', fetchImpl })

  const resultado = await pasarela.interpretarNotificacion({ type: 'payment', data: { id: '5' } })

  assert.deepEqual(resultado, { referenciaExterna: 'pago1', estado: 'RECHAZADO' })
})

test('interpretarNotificacion ignora avisos que no son de un pago (sin consultar)', async () => {
  let consulto = false
  const fetchImpl = async () => { consulto = true; return { ok: true, async json() { return {} } } }
  const pasarela = crearPasarelaMercadoPago({ accessToken: 'x', fetchImpl })

  const resultado = await pasarela.interpretarNotificacion({ type: 'merchant_order', data: { id: '5' } })

  assert.equal(resultado, null)
  assert.equal(consulto, false)
})

test('interpretarNotificacion devuelve null si el estado aún no es terminal', async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() { return { status: 'in_process', external_reference: 'pago1' } },
  })
  const pasarela = crearPasarelaMercadoPago({ accessToken: 'x', fetchImpl })

  const resultado = await pasarela.interpretarNotificacion({ type: 'payment', data: { id: '5' } })

  assert.equal(resultado, null)
})

test('un error de la API de MP se propaga', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, async text() { return 'unauthorized' } })
  const pasarela = crearPasarelaMercadoPago({ accessToken: 'malo', fetchImpl })

  await assert.rejects(
    pasarela.crearPreferencia({ pagoId: 'p', pedidoNumero: 1, monto: 100 }),
    /Mercado Pago 401/,
  )
})

test('crearPasarelaMercadoPago exige un access token', () => {
  assert.throws(() => crearPasarelaMercadoPago({}), /access token/)
})
