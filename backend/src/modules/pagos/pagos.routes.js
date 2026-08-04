import { Router } from 'express'
import { iniciarPago, ErrorPago } from './pagos.service.js'
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
export function crearRouterPagos(servicio = { iniciarPago }) {
  const router = Router()

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
