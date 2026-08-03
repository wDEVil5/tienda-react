import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCorreo } from '../src/modules/correo/correo.service.js'
import { crearTransporteMemoria } from '../src/modules/correo/correo.transporte.js'

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
