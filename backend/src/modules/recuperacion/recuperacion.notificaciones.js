import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'

// Plantilla del correo de recuperación. Pura: se prueba el contenido sin enviar.
// No incluye datos de la cuenta más allá del nombre para no filtrar nada si el
// correo llega a la bandeja equivocada.
export function plantillaRecuperacion({ nombre, enlace }) {
  const saludo = nombre ? `Hola ${nombre},` : 'Hola,'
  const texto = [
    saludo,
    '',
    'Recibimos una solicitud para restablecer tu contraseña en SumarketExpress.',
    'Abre este enlace para elegir una nueva (vence en 1 hora):',
    '',
    enlace,
    '',
    'Si no lo pediste, ignora este correo: tu contraseña no cambia.',
  ].join('\n')
  const html = [
    `<p>${saludo}</p>`,
    '<p>Recibimos una solicitud para restablecer tu contraseña en <strong>SumarketExpress</strong>.</p>',
    `<p><a href="${enlace}">Elegir una nueva contraseña</a> (el enlace vence en 1 hora).</p>`,
    '<p>Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>',
  ].join('')
  return { asunto: 'Restablece tu contraseña · SumarketExpress', texto, html }
}

// Notificador configurado por dominio: `construirEnlace(token)` arma la URL del
// frontend correcta (clientes vs. staff apuntan a pantallas distintas). Recibe el
// servicio de correo como dependencia (memoria en tests, Brevo en prod).
export function crearNotificadorRecuperacion({
  servicioCorreo = servicioCorreoPorDefecto,
  construirEnlace,
} = {}) {
  return {
    async enviarEnlace({ para, nombre, token }) {
      const enlace = construirEnlace(token)
      const mensaje = plantillaRecuperacion({ nombre, enlace })
      return servicioCorreo.enviar({ para, ...mensaje })
    },
  }
}
