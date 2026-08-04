const API = 'https://api.mercadopago.com'

// Estados de Mercado Pago que nos interesan, mapeados a nuestro EstadoPago. Los
// intermedios (pending, in_process, authorized) se ignoran hasta que resuelvan.
const MAPA_ESTADO = {
  approved: 'APROBADO',
  rejected: 'RECHAZADO',
  cancelled: 'RECHAZADO',
}

// Adaptador real de Mercado Pago. Implementa la MISMA interfaz que la pasarela
// falsa (proveedor, crearPreferencia, interpretarNotificacion), así el servicio
// de pagos no cambia. `fetchImpl` es inyectable para probar sin llamar a la API.
export function crearPasarelaMercadoPago({
  accessToken,
  urlBase = process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  // A dónde MP envía el webhook. En local necesita ser una URL pública (túnel);
  // si no se define, MP no notifica (útil para pruebas de solo crear preferencia).
  notificationUrl = process.env.MP_WEBHOOK_URL,
  fetchImpl = fetch,
} = {}) {
  if (!accessToken) {
    throw new Error('Mercado Pago requiere un access token.')
  }

  async function mpFetch(ruta, opciones = {}) {
    const respuesta = await fetchImpl(`${API}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...opciones.headers,
      },
    })
    if (!respuesta.ok) {
      const cuerpo = await respuesta.text()
      throw new Error(`Mercado Pago ${respuesta.status}: ${cuerpo}`)
    }
    return respuesta.json()
  }

  return {
    proveedor: 'mercadopago',

    async crearPreferencia({ pagoId, pedidoNumero, monto }) {
      const preferencia = await mpFetch('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              title: `Pedido #SE-${pedidoNumero}`,
              quantity: 1,
              unit_price: monto,
              currency_id: 'CLP',
            },
          ],
          // external_reference viaja de la preferencia al pago y vuelve en el
          // webhook: es cómo correlacionamos la notificación con nuestro Pago.
          external_reference: pagoId,
          back_urls: {
            success: `${urlBase}/pago/exito`,
            failure: `${urlBase}/pago/error`,
            pending: `${urlBase}/pago/pendiente`,
          },
          // Solo se incluye si hay URL pública configurada (túnel/producción).
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        }),
      })

      return { referenciaExterna: pagoId, urlPago: preferencia.init_point }
    },

    // El webhook de MP solo avisa "hay novedad en el pago N"; el cuerpo NO es
    // confiable. Consultamos el pago con nuestro token para saber su estado real
    // y su external_reference (nuestro pagoId). Devuelve null si el aviso no es
    // de un pago o el estado aún no es terminal.
    async interpretarNotificacion(payload) {
      // MP notifica de dos formas: webhook nuevo (JSON { type, data.id }) e IPN
      // viejo (query { topic, id }). Aceptamos ambas.
      const paymentId = payload?.data?.id ?? payload?.id
      const tipo = payload?.type ?? payload?.topic
      if (tipo !== 'payment' || !paymentId) {
        return null
      }

      const pago = await mpFetch(`/v1/payments/${paymentId}`)
      const estado = MAPA_ESTADO[pago.status]
      if (!estado || !pago.external_reference) {
        return null
      }

      return { referenciaExterna: pago.external_reference, estado }
    },
  }
}
