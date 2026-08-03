import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearNotificadorPedidos,
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
