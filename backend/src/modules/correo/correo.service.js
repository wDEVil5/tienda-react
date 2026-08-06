import { crearTransporteBrevo, crearTransporteConsola } from './correo.transporte.js'

// Remitente único de la tienda. Se puede sobreescribir por entorno sin tocar
// código; el default sirve para desarrollo.
const REMITENTE_POR_DEFECTO =
  process.env.CORREO_REMITENTE || 'SumarketExpress <no-responder@sumarketexpress.cl>'

// Selección de transporte por entorno: con BREVO_API_KEY se envía de verdad por
// Brevo; sin ella, va a la consola (dev). Los tests inyectan el de memoria, así
// que no dependen de esto. Mismo criterio que la pasarela de pagos.
function transportePorDefecto() {
  if (process.env.BREVO_API_KEY) {
    return crearTransporteBrevo({ apiKey: process.env.BREVO_API_KEY })
  }
  return crearTransporteConsola()
}

// Servicio de correo: única puerta de salida de correos de la aplicación.
// Recibe el transporte como dependencia (memoria en tests, consola en dev, un
// proveedor real en producción) y le agrega el remitente de la tienda.
export function crearServicioCorreo({
  transporte = transportePorDefecto(),
  remitente = REMITENTE_POR_DEFECTO,
} = {}) {
  return {
    async enviar({ para, asunto, texto, html }) {
      if (!para) {
        throw new Error('El correo necesita un destinatario.')
      }
      if (!asunto) {
        throw new Error('El correo necesita un asunto.')
      }

      return transporte.enviar({ de: remitente, para, asunto, texto, html })
    },
  }
}

export const servicioCorreo = crearServicioCorreo()
