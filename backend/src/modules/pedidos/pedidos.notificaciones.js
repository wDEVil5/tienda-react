import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'

// Formatea un entero CLP como "$1.290" (miles con punto). Manual, sin depender
// de Intl/ICU, para que el contenido sea determinista en las pruebas.
function formatearCLP(monto) {
  const entero = Math.round(monto)
  return `$${entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

// Referencia legible del pedido para el cliente ("SE-1043"); el uuid es interno.
function referenciaPedido(numero) {
  return `#SE-${numero}`
}

// Plantilla de confirmación de pedido. Pura: se prueba el contenido sin enviar.
export function plantillaConfirmacionPedido(pedido) {
  const referencia = referenciaPedido(pedido.numero)
  const entrega = pedido.modalidad === 'DESPACHO' ? 'Despacho a domicilio' : 'Retiro en tienda'
  const lineas = pedido.items.map(
    (item) => `  ${item.cantidad}× ${item.nombre} — ${formatearCLP(item.subtotal)}`,
  )

  const texto = [
    `¡Gracias por tu compra, ${pedido.contactoNombre}!`,
    '',
    `Pedido ${referencia} · ${entrega}`,
    '',
    ...lineas,
    '',
    `Total: ${formatearCLP(pedido.total)}`,
    '',
    'Te avisaremos por correo cuando cambie el estado de tu pedido.',
  ].join('\n')

  const filas = pedido.items
    .map((item) => `<li>${item.cantidad}× ${item.nombre} — ${formatearCLP(item.subtotal)}</li>`)
    .join('')
  const html = [
    `<p>¡Gracias por tu compra, <strong>${pedido.contactoNombre}</strong>!</p>`,
    `<p>Pedido <strong>${referencia}</strong> · ${entrega}</p>`,
    `<ul>${filas}</ul>`,
    `<p><strong>Total: ${formatearCLP(pedido.total)}</strong></p>`,
  ].join('')

  return { asunto: `Confirmación de tu pedido ${referencia}`, texto, html }
}

// Envía la confirmación de un pedido recién creado. Recibe el servicio de correo
// como dependencia (memoria en tests, consola en dev, proveedor real en prod).
export function crearNotificadorPedidos({ servicioCorreo = servicioCorreoPorDefecto } = {}) {
  return {
    async enviarConfirmacion(pedido) {
      const mensaje = plantillaConfirmacionPedido(pedido)
      return servicioCorreo.enviar({ para: pedido.contactoEmail, ...mensaje })
    },
  }
}

export const notificadorPedidos = crearNotificadorPedidos()
