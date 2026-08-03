import { Router } from 'express'
import { suscribirAviso, ErrorAviso } from './avisos.service.js'
import { validarAviso } from './avisos.validacion.js'
import { clienteOpcional } from '../cuenta/cuenta.middleware.js'

// A qué código HTTP corresponde cada error de negocio del aviso.
const ESTADO_POR_CODIGO = {
  PRODUCT_NOT_FOUND: 404,
  ALREADY_SUBSCRIBED: 409,
  PRODUCT_AVAILABLE: 409,
}

// Suscripción pública a "Avísame". La sesión es opcional: un invitado puede
// suscribirse solo con su correo; si hay sesión de cliente, se enlaza su id.
export function crearRouterAvisos(
  servicio = { suscribir: suscribirAviso },
  { middlewareCliente = clienteOpcional } = {},
) {
  const router = Router()

  router.post('/', middlewareCliente, async (request, response, next) => {
    const validacion = validarAviso(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: { code: 'INVALID_NOTICE_DATA', message: 'Revisa los datos del aviso.' },
      })
    }

    try {
      const aviso = await servicio.suscribir({
        ...validacion.data,
        clienteId: request.cliente?.id ?? null,
      })
      return response.status(201).json({
        data: {
          id: aviso.id,
          productoId: aviso.productoId,
          email: aviso.email,
          creadoEn: aviso.creadoEn,
        },
      })
    } catch (error) {
      if (error instanceof ErrorAviso) {
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

export default crearRouterAvisos()
