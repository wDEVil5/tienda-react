import { Router } from 'express'
import { iniciarPago, procesarNotificacion, ErrorPago } from './pagos.service.js'
import { validarIniciarPago } from './pagos.validacion.js'

// A qué código HTTP corresponde cada error de negocio del pago.
const ESTADO_POR_CODIGO = {
  ORDER_NOT_FOUND: 404,
  ORDER_NOT_PAYABLE: 409,
  ORDER_ALREADY_PAID: 409,
}

// Inicia el pago de un pedido y devuelve la URL a la que redirigir al cliente.
// El id del pedido (uuid) actúa como capacidad, igual que el checkout de
// invitado; no exige sesión.
export function crearRouterPagos(servicio = { iniciarPago, procesarNotificacion }) {
  const router = Router()

  // Webhook del proveedor (servidor a servidor). SIEMPRE responde 200 para
  // acusar recibo y que el proveedor no reintente en bucle; solo un error
  // inesperado (500) provoca reintento. La verificación de firma del proveedor
  // se agrega con el adaptador real (CP4).
  router.post('/webhook', async (request, response, next) => {
    try {
      const resultado = await servicio.procesarNotificacion(request.body)
      return response.status(200).json({ ok: true, ...resultado })
    } catch (error) {
      return next(error)
    }
  })

  router.post('/', async (request, response, next) => {
    const validacion = validarIniciarPago(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: { code: 'INVALID_PAYMENT_DATA', message: 'Revisa los datos del pago.' },
      })
    }

    try {
      const resultado = await servicio.iniciarPago(validacion.data.pedidoId)
      return response.status(201).json({ data: resultado })
    } catch (error) {
      if (error instanceof ErrorPago) {
        const status = ESTADO_POR_CODIGO[error.code] ?? 400
        return response.status(status).json({
          error: { code: error.code, message: error.message },
        })
      }
      return next(error)
    }
  })

  return router
}

export default crearRouterPagos()
