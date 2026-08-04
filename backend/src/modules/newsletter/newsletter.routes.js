import { Router } from 'express'
import { suscribirNewsletter, ErrorNewsletter } from './newsletter.service.js'
import { validarSuscripcion } from './newsletter.validacion.js'
import { clienteOpcional } from '../cuenta/cuenta.middleware.js'

// A qué código HTTP corresponde cada error de negocio del boletín.
const ESTADO_POR_CODIGO = {
  ALREADY_SUBSCRIBED: 409,
}

// Suscripción pública al boletín. La sesión es opcional: un invitado se suscribe
// solo con su correo; si hay sesión de cliente, se enlaza su id.
export function crearRouterNewsletter(
  servicio = { suscribir: suscribirNewsletter },
  { middlewareCliente = clienteOpcional } = {},
) {
  const router = Router()

  router.post('/', middlewareCliente, async (request, response, next) => {
    const validacion = validarSuscripcion(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: { code: 'INVALID_SUBSCRIPTION_DATA', message: 'Revisa el correo ingresado.' },
      })
    }

    try {
      const suscriptor = await servicio.suscribir({
        ...validacion.data,
        clienteId: request.cliente?.id ?? null,
      })
      return response.status(201).json({
        data: { id: suscriptor.id, email: suscriptor.email, estado: suscriptor.estado },
      })
    } catch (error) {
      if (error instanceof ErrorNewsletter) {
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

export default crearRouterNewsletter()
