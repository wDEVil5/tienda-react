import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCorreo } from '../src/modules/correo/correo.service.js'
import {
  crearTransporteBrevo,
  crearTransporteMemoria,
} from '../src/modules/correo/correo.transporte.js'

test('enviar entrega el mensaje al transporte con el remitente configurado', async () => {
  const transporte = crearTransporteMemoria()
  const servicio = crearServicioCorreo({ transporte, remitente: 'Tienda <hola@tienda.cl>' })

  await servicio.enviar({
    para: 'ana@correo.cl',
    asunto: 'Volvió el stock',
    texto: 'Ya puedes comprarlo.',
  })

  assert.equal(transporte.enviados.length, 1)
  assert.equal(transporte.enviados[0].de, 'Tienda <hola@tienda.cl>')
  assert.equal(transporte.enviados[0].para, 'ana@correo.cl')
  assert.equal(transporte.enviados[0].asunto, 'Volvió el stock')
})

test('enviar exige un destinatario', async () => {
  const servicio = crearServicioCorreo({ transporte: crearTransporteMemoria() })

  await assert.rejects(
    servicio.enviar({ asunto: 'Hola', texto: 'x' }),
    /destinatario/,
  )
})

test('enviar exige un asunto', async () => {
  const servicio = crearServicioCorreo({ transporte: crearTransporteMemoria() })

  await assert.rejects(
    servicio.enviar({ para: 'ana@correo.cl', texto: 'x' }),
    /asunto/,
  )
})

test('el transporte de memoria devuelve un identificador por mensaje', async () => {
  const transporte = crearTransporteMemoria()
  const servicio = crearServicioCorreo({ transporte })

  const resultado = await servicio.enviar({ para: 'ana@correo.cl', asunto: 'Hola' })

  assert.match(resultado.id, /^mem-1$/)
})

test('el transporte Brevo hace POST a la API con api-key y mapea el mensaje', async () => {
  const llamadas = []
  const fetchFalso = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return { ok: true, status: 201, async json() { return { messageId: 'brevo-123' } } }
  }
  const transporte = crearTransporteBrevo({ apiKey: 'clave-test', fetchImpl: fetchFalso })

  const resultado = await transporte.enviar({
    de: 'Tienda <hola@tienda.cl>',
    para: 'ana@correo.cl',
    asunto: 'Recupera tu contraseña',
    texto: 'Enlace de recuperación.',
    html: '<p>Enlace de recuperación.</p>',
  })

  assert.equal(resultado.id, 'brevo-123')
  assert.equal(llamadas.length, 1)
  assert.equal(llamadas[0].url, 'https://api.brevo.com/v3/smtp/email')
  assert.equal(llamadas[0].opciones.method, 'POST')
  assert.equal(llamadas[0].opciones.headers['api-key'], 'clave-test')
  const cuerpo = JSON.parse(llamadas[0].opciones.body)
  assert.deepEqual(cuerpo.sender, { name: 'Tienda', email: 'hola@tienda.cl' })
  assert.deepEqual(cuerpo.to, [{ email: 'ana@correo.cl' }])
  assert.equal(cuerpo.subject, 'Recupera tu contraseña')
  assert.equal(cuerpo.htmlContent, '<p>Enlace de recuperación.</p>')
  assert.equal(cuerpo.textContent, 'Enlace de recuperación.')
})

test('el transporte Brevo lanza si la API responde con error (reintentable)', async () => {
  const fetchFalso = async () => ({ ok: false, status: 401, async text() { return 'Unauthorized' } })
  const transporte = crearTransporteBrevo({ apiKey: 'clave', fetchImpl: fetchFalso })

  await assert.rejects(
    transporte.enviar({ de: 'x@x.cl', para: 'ana@correo.cl', asunto: 'Hola' }),
    /Brevo rechazó el envío \(401\)/,
  )
})

test('el transporte Brevo exige una API key', () => {
  assert.throws(() => crearTransporteBrevo({ apiKey: '' }), /BREVO_API_KEY/)
})
