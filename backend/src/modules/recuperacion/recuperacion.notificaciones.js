import { servicioCorreo as servicioCorreoPorDefecto } from '../correo/correo.service.js'
import { plantillaBaseHTML, botonHTML, calloutHTML } from '../correo/correo.html.js'

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
  const contenido = `
    <h2>${saludo}</h2>
    <p class="muted">Recibimos una solicitud para restablecer tu contraseña en <strong style="color:#1c1b18;">SumarketExpress</strong>. Haz clic en el botón para elegir una nueva:</p>

    ${botonHTML({ href: enlace, texto: 'Restablecer mi contraseña' })}

    ${calloutHTML({
      tono: 'seguridad',
      contenido: 'Por seguridad, este enlace <strong>vence en 1 hora</strong> y sirve una sola vez. Si no solicitaste el cambio, ignora este correo: tu contraseña no cambiará.',
    })}

    <p class="muted" style="margin-top:20px;">¿El botón no funciona? Copia y pega este enlace en tu navegador:</p>
    <p style="word-break:break-all;font-size:13px;color:#6f6d64;margin-top:-6px;">${enlace}</p>
  `

  const html = plantillaBaseHTML({
    titulo: 'Restablece tu contraseña · SumarketExpress',
    preheader: 'Instrucciones para restablecer tu contraseña en SumarketExpress',
    contenido
  })

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
