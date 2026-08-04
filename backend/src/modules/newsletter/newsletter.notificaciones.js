import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'

// URL pública de la tienda para armar el enlace de baja. Reutiliza la misma
// variable que CORS: el frontend vive en ese origen.
const URL_TIENDA = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

// Plantilla del correo de bienvenida al boletín. Pura: el contenido se prueba
// sin enviar nada. El enlace de baja lleva el token (cancelar con un clic) y
// apunta a la página del frontend, que a su vez llama a POST /api/newsletter/baja.
export function plantillaBienvenida({ token, urlBase = URL_TIENDA }) {
  const urlBaja = `${urlBase}/newsletter/baja?token=${token}`
  return {
    asunto: 'Te suscribiste a las ofertas de SumarketExpress',
    texto: `¡Bienvenido! Cada lunes te enviaremos las ofertas de la semana.\n\n¿Ya no quieres recibirlas? Cancela con un clic: ${urlBaja}`,
    html: `<p>¡Bienvenido! Cada lunes te enviaremos las ofertas de la semana.</p><p><a href="${urlBaja}">Cancelar suscripción</a></p>`,
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
