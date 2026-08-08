import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'
import { plantillaBaseHTML, botonHTML } from '../correo/correo.html.js'

// URL pública de la tienda para armar el enlace de baja. Reutiliza la misma
// variable que CORS: el frontend vive en ese origen.
const URL_TIENDA = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

// Plantilla del correo de bienvenida al boletín. Pura: el contenido se prueba
// sin enviar nada. El enlace de baja lleva el token (cancelar con un clic) y
// apunta a la página del frontend, que a su vez llama a POST /api/newsletter/baja.
export function plantillaBienvenida({ token, urlBase = URL_TIENDA }) {
  const urlBaja = `${urlBase}/newsletter/baja?token=${token}`
  const item = (texto) =>
    `<tr><td style="padding:6px 0;font-size:15px;line-height:1.5;"><span style="color:#2f6b4a;font-weight:700;">✓</span>&nbsp;&nbsp;${texto}</td></tr>`

  const contenido = `
    <h2>¡Bienvenido al boletín! 🎉</h2>
    <p class="muted">Cada lunes te llegan nuestras mejores ofertas y novedades, directo a tu bandeja de entrada. Esto es lo que vas a recibir:</p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0 20px;">
      ${item('Ofertas de la semana antes que nadie')}
      ${item('Descuentos exclusivos para suscriptores')}
      ${item('Novedades y productos que vuelven a stock')}
    </table>

    ${botonHTML({ href: urlBase, texto: 'Ver ofertas de hoy' })}

    <p class="muted" style="margin-top:24px;text-align:center;">
      ¿Ya no quieres recibirlas? <a href="${urlBaja}" style="color:#6f6d64;">Cancela tu suscripción</a> con un clic.
    </p>
  `

  const html = plantillaBaseHTML({
    titulo: 'Te suscribiste a las ofertas de SumarketExpress',
    preheader: '¡Bienvenido! Cada lunes te enviaremos las ofertas de la semana.',
    contenido
  })

  return {
    asunto: 'Te suscribiste a las ofertas de SumarketExpress',
    texto: `¡Bienvenido! Cada lunes te enviaremos las ofertas de la semana.\n\n¿Ya no quieres recibirlas? Cancela con un clic: ${urlBaja}`,
    html,
  }
}

// Envía la bienvenida a un suscriptor recién dado de alta. Recibe el servicio de
// correo como dependencia (memoria en tests, consola en dev, proveedor real en
// producción).
export function crearNotificadorNewsletter({
  servicioCorreo = servicioCorreoPorDefecto,
  urlBase = URL_TIENDA,
} = {}) {
  return {
    async enviarBienvenida(suscriptor) {
      const mensaje = plantillaBienvenida({ token: suscriptor.token, urlBase })
      return servicioCorreo.enviar({ para: suscriptor.email, ...mensaje })
    },
  }
}

export const notificadorNewsletter = crearNotificadorNewsletter()
