import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearNotificadorPedidos,
  plantillaCambioEstado,
  plantillaConfirmacionPedido,
} from '../src/modules/pedidos/pedidos.notificaciones.js'

const pedido = {
  numero: 1043,
  modalidad: 'DESPACHO',
  contactoNombre: 'Camila R.',
  contactoEmail: 'camila@correo.cl',
  total: 21470,
  items: [
    { nombre: 'Aceite', cantidad: 2, subtotal: 15980 },
    { nombre: 'Café', cantidad: 1, subtotal: 5490 },
  ],
}

test('plantillaConfirmacionPedido arma asunto con la referencia legible', () => {
  const mensaje = plantillaConfirmacionPedido(pedido)
  assert.equal(mensaje.asunto, 'Confirmación de tu pedido #SE-1043')
})

test('plantillaConfirmacionPedido lista los ítems y el total en CLP', () => {
  const mensaje = plantillaConfirmacionPedido(pedido)
  assert.match(mensaje.texto, /2× Aceite — \$15\.980/)
  assert.match(mensaje.texto, /Total: \$21\.470/)
  assert.match(mensaje.html, /<strong>Total: \$21\.470<\/strong>/)
})

test('plantillaConfirmacionPedido refleja la modalidad de entrega', () => {
  assert.match(plantillaConfirmacionPedido(pedido).texto, /Despacho a domicilio/)
  assert.match(
    plantillaConfirmacionPedido({ ...pedido, modalidad: 'RETIRO' }).texto,
    /Retiro en tienda/,
  )
})

test('enviarConfirmacion manda el correo al contacto del pedido', async () => {
  const enviados = []
  const notificador = crearNotificadorPedidos({
    servicioCorreo: {
      async enviar(mensaje) { enviados.push(mensaje) },
    },
  })

  await notificador.enviarConfirmacion(pedido)

  assert.equal(enviados.length, 1)
  assert.equal(enviados[0].para, 'camila@correo.cl')
  assert.equal(enviados[0].asunto, 'Confirmación de tu pedido #SE-1043')
})

test('plantillaCambioEstado arma el asunto con la referencia y el estado', () => {
  const mensaje = plantillaCambioEstado({ numero: 1043, estado: 'ENVIADO', contactoNombre: 'Camila R.' })
  assert.match(mensaje.asunto, /#SE-1043/)
  assert.match(mensaje.asunto, /Enviado/)
})

test('plantillaCambioEstado usa un mensaje propio de cada estado', () => {
  assert.match(
    plantillaCambioEstado({ numero: 1, estado: 'ENTREGADO', contactoNombre: 'Ana' }).texto,
    /entregado/i,
  )
  assert.match(
    plantillaCambioEstado({ numero: 1, estado: 'CANCELADO', contactoNombre: 'Ana' }).texto,
    /cancelado/i,
  )
})

test('enviarCambioEstado manda el correo al contacto del pedido', async () => {
  const enviados = []
  const notificador = crearNotificadorPedidos({
    servicioCorreo: {
      async enviar(mensaje) { enviados.push(mensaje) },
    },
  })

  await notificador.enviarCambioEstado({
    numero: 1043,
    estado: 'ENVIADO',
    contactoNombre: 'Camila R.',
    contactoEmail: 'camila@correo.cl',
  })

  assert.equal(enviados.length, 1)
  assert.equal(enviados[0].para, 'camila@correo.cl')
  assert.match(enviados[0].asunto, /Enviado/)
})
