import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'
import { plantillaBaseHTML } from '../correo/correo.html.js'

// URL pública de la tienda para armar el enlace de baja. Reutiliza la misma
// variable que CORS: el frontend vive en ese origen.
const URL_TIENDA = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

// Plantilla del correo de bienvenida al boletín. Pura: el contenido se prueba
// sin enviar nada. El enlace de baja lleva el token (cancelar con un clic) y
// apunta a la página del frontend, que a su vez llama a POST /api/newsletter/baja.
export function plantillaBienvenida({ token, urlBase = URL_TIENDA }) {
  const urlBaja = `${urlBase}/newsletter/baja?token=${token}`
  const contenido = `
    <h2>¡Bienvenido al boletín!</h2>
    <p>A partir de ahora, cada lunes te enviaremos nuestras mejores ofertas y novedades directamente a tu bandeja de entrada.</p>
    <br/>
    <p style="font-size: 14px; color: #6f6d64;">¿Cambiaste de opinión y ya no quieres recibirlas?</p>
    <a href="${urlBaja}" class="btn" style="background-color: #f2efe9; color: #1c1b18 !important; border: 1px solid #ddd9cf;">Cancelar suscripción</a>
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
