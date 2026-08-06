import { Router } from 'express'
import { crearLimitadorIntentosLogin } from '../auth/limite-intentos.js'
import { ErrorRecuperacion } from './recuperacion.service.js'
import {
  validarRestablecerContrasena,
  validarSolicitudRecuperacion,
} from './recuperacion.validacion.js'

// Router genérico de recuperación: mismas dos rutas para clientes y para staff,
// parametrizado por el `servicio` (que ya trae el dominio y el notificador
// correctos). Se monta dos veces en app.js con servicios distintos.
export function crearRouterRecuperacion({ servicio, limitar = crearLimitadorIntentosLogin() } = {}) {
  const router = Router()

  // Pedir el enlace. Responde SIEMPRE 202 con el mismo mensaje, exista o no el
  // correo: no revela si la cuenta está registrada. Rate-limit por IP contra spam.
  router.post('/recuperacion', limitar, async (request, response, next) => {
    const validacion = validarSolicitudRecuperacion(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_RECOVERY_REQUEST',
          message: 'Ingresa un correo válido.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      await servicio.solicitar({ email: validacion.data.email })
      return response.status(202).json({
        data: {
          mensaje:
            'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.',
        },
      })
    } catch (error) {
      return next(error)
    }
  })

  // Restablecer con el token del enlace. 204 al cambiar; 400 INVALID_TOKEN si el
  // enlace ya no sirve; 422 si la nueva contraseña no cumple la política.
  router.post('/restablecer', async (request, response, next) => {
    const validacion = validarRestablecerContrasena(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_RESET_DATA',
          message: 'Revisa el enlace y la nueva contraseña (mínimo 12 caracteres).',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      await servicio.restablecer(validacion.data)
      return response.status(204).end()
    } catch (error) {
      if (error instanceof ErrorRecuperacion) {
        return response.status(400).json({
          error: { code: error.codigo, message: error.message },
        })
      }
      return next(error)
    }
  })

  return router
}
