import { Router } from 'express'
import { suscribirNewsletter, darDeBajaNewsletter, ErrorNewsletter } from './newsletter.service.js'
import { validarSuscripcion } from './newsletter.validacion.js'
import { clienteOpcional } from '../cuenta/cuenta.middleware.js'

// A qué código HTTP corresponde cada error de negocio del boletín.
const ESTADO_POR_CODIGO = {
  ALREADY_SUBSCRIBED: 409,
  SUBSCRIPTION_NOT_FOUND: 404,
}

function responderError(response, error, next) {
  if (error instanceof ErrorNewsletter) {
    const status = ESTADO_POR_CODIGO[error.code] ?? 400
    return response.status(status).json({ error: { code: error.code, message: error.message } })
  }
  return next(error)
}

// Suscripción pública al boletín. La sesión es opcional: un invitado se suscribe
// solo con su correo; si hay sesión de cliente, se enlaza su id.
export function crearRouterNewsletter(
  servicio = { suscribir: suscribirNewsletter, darDeBaja: darDeBajaNewsletter },
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
      return responderError(response, error, next)
    }
  })

  // Baja con un clic: el enlace del correo lleva el token. Es POST (no GET) para
  // que no la disparen los prefetch de los clientes de correo; el enlace apunta
  // a una página del frontend que llama aquí.
  router.post('/baja', async (request, response, next) => {
    const token = typeof request.body?.token === 'string' ? request.body.token.trim() : ''
    if (!token) {
      return response.status(422).json({
        error: { code: 'INVALID_SUBSCRIPTION_DATA', message: 'Falta el token de baja.' },
      })
    }

    try {
      const suscriptor = await servicio.darDeBaja({ token })
      return response.json({ data: { email: suscriptor.email, estado: suscriptor.estado } })
    } catch (error) {
      return responderError(response, error, next)
    }
  })

  return router
}

export default crearRouterNewsletter()
