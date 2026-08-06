// Transportes de correo intercambiables. El servicio de correo no sabe *cómo*
// se envía un mensaje: recibe un transporte que implemente enviar(mensaje). Así
// desarrollo y pruebas no dependen de un proveedor real, y conectar SMTP el día
// de mañana es agregar un transporte nuevo, no reescribir la lógica.

// Transporte de desarrollo en memoria: guarda los correos para inspeccionarlos
// en pruebas. No envía nada fuera.
export function crearTransporteMemoria() {
  const enviados = []
  return {
    async enviar(mensaje) {
      enviados.push(mensaje)
      return { id: `mem-${enviados.length}` }
    },
    enviados,
  }
}

// Transporte de consola: registra el correo en el log del servidor. Es el que
// usa el servidor mientras no haya un proveedor real conectado.
export function crearTransporteConsola() {
  return {
    async enviar(mensaje) {
      console.log(`[correo] para=${mensaje.para} asunto="${mensaje.asunto}"`)
      return { id: `log-${Date.now()}` }
    },
  }
}

// Convierte un remitente "Nombre <correo@dominio>" al objeto { name, email } que
// espera la API de Brevo. Si no trae ángulos, se toma todo como el correo.
function separarRemitente(de) {
  const coincidencia = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(de ?? '')
  if (coincidencia) {
    const nombre = coincidencia[1].trim()
    return nombre ? { name: nombre, email: coincidencia[2] } : { email: coincidencia[2] }
  }
  return { email: (de ?? '').trim() }
}

// Transporte real vía la API transaccional de Brevo (v3/smtp/email). Sin SDK: usa
// `fetch` (inyectable para las pruebas), igual que el adaptador de Mercado Pago.
// El remitente debe estar verificado en Brevo; con eso envía a cualquier
// destinatario aunque no haya dominio propio. Lanza si el envío falla, para que
// el llamador (fire-and-forget) pueda reintentar sin marcarlo como enviado.
export function crearTransporteBrevo({
  apiKey = process.env.BREVO_API_KEY,
  fetchImpl = fetch,
  urlBase = 'https://api.brevo.com/v3',
} = {}) {
  if (!apiKey) {
    throw new Error('El transporte de correo Brevo requiere BREVO_API_KEY.')
  }
  return {
    async enviar({ de, para, asunto, texto, html }) {
      const cuerpo = {
        sender: separarRemitente(de),
        to: [{ email: para }],
        subject: asunto,
        ...(texto ? { textContent: texto } : {}),
        ...(html ? { htmlContent: html } : {}),
      }
      const respuesta = await fetchImpl(`${urlBase}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(cuerpo),
      })
      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '')
        throw new Error(`Brevo rechazó el envío (${respuesta.status}): ${detalle}`)
      }
      const datos = await respuesta.json().catch(() => ({}))
      return { id: datos.messageId ?? null }
    },
  }
}
