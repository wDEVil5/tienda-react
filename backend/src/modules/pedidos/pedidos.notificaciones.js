import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'
import { plantillaBaseHTML } from '../correo/correo.html.js'

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
    .map(
      (item) => `
      <tr>
        <td>${item.cantidad}× ${item.nombre}</td>
        <td class="precio">${formatearCLP(item.subtotal)}</td>
      </tr>`,
    )
    .join('')
    
  const contenido = `
    <h2>¡Gracias por tu compra, ${pedido.contactoNombre}!</h2>
    <p>Estamos procesando tu pedido <strong>${referencia}</strong> con modalidad de <strong>${entrega}</strong>.</p>
    
    <table class="tabla-items" cellpadding="0" cellspacing="0" role="presentation">
      <thead>
        <tr>
          <th>Producto</th>
          <th style="text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
        <tr class="total-row">
          <td>Total</td>
          <td class="precio">${formatearCLP(pedido.total)}</td>
        </tr>
      </tbody>
    </table>
    
    <p>Te avisaremos por correo cuando cambie el estado de tu pedido.</p>
  `

  const html = plantillaBaseHTML({
    titulo: `Confirmación de tu pedido ${referencia}`,
    preheader: `Tu pedido ${referencia} está confirmado por un total de ${formatearCLP(pedido.total)}.`,
    contenido
  })

  return { asunto: `Confirmación de tu pedido ${referencia}`, texto, html }
}

// Etiqueta amable y frase por estado para el correo de seguimiento (RF-5.6).
const ETIQUETA_ESTADO = {
  PENDIENTE: 'Pendiente',
  PREPARANDO: 'En preparación',
  LISTO_PARA_RETIRO: 'Listo para retiro',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}
const MENSAJE_ESTADO = {
  PENDIENTE: 'Actualizamos el estado de tu pedido.',
  PREPARANDO: 'Estamos preparando tu pedido.',
  LISTO_PARA_RETIRO: 'Tu pedido está listo para retirar en tienda.',
  ENVIADO: 'Tu pedido va en camino.',
  ENTREGADO: '¡Tu pedido fue entregado! Gracias por comprar con nosotros.',
  CANCELADO: 'Tu pedido fue cancelado. Si tienes dudas, respóndenos este correo.',
}

// Plantilla del aviso de cambio de estado. Pura: se prueba el contenido sin enviar.
export function plantillaCambioEstado(pedido) {
  const referencia = referenciaPedido(pedido.numero)
  const etiqueta = ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado
  const mensaje = MENSAJE_ESTADO[pedido.estado] ?? 'Actualizamos el estado de tu pedido.'

  const texto = [
    `Hola ${pedido.contactoNombre},`,
    '',
    `Tu pedido ${referencia} cambió de estado: ${etiqueta}.`,
    mensaje,
  ].join('\n')
  const contenido = `
    <h2>Hola ${pedido.contactoNombre},</h2>
    <p>Tu pedido <strong>${referencia}</strong> cambió de estado a: <strong style="color: #2f6b4a;">${etiqueta}</strong>.</p>
    <p>${mensaje}</p>
  `

  const html = plantillaBaseHTML({
    titulo: `Tu pedido ${referencia} · ${etiqueta}`,
    preheader: `Actualización de estado: ${etiqueta}`,
    contenido
  })

  return { asunto: `Tu pedido ${referencia} · ${etiqueta}`, texto, html }
}

// Envía la confirmación de un pedido recién creado y los avisos de cambio de
// estado. Recibe el servicio de correo como dependencia (memoria en tests,
// consola en dev, proveedor real en prod).
export function crearNotificadorPedidos({ servicioCorreo = servicioCorreoPorDefecto } = {}) {
  return {
    async enviarConfirmacion(pedido) {
      const mensaje = plantillaConfirmacionPedido(pedido)
      return servicioCorreo.enviar({ para: pedido.contactoEmail, ...mensaje })
    },
    async enviarCambioEstado(pedido) {
      const mensaje = plantillaCambioEstado(pedido)
      return servicioCorreo.enviar({ para: pedido.contactoEmail, ...mensaje })
    },
  }
}

export const notificadorPedidos = crearNotificadorPedidos()
