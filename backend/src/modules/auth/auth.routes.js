import { Router } from 'express'
import {
  cambiarContrasenaPropia,
  cerrarSesion,
  iniciarSesion,
  obtenerSesionActiva,
} from './auth.service.js'
import { crearRequerirSesion } from './auth.middleware.js'
import { crearLimitadorIntentosLogin } from './limite-intentos.js'
import { opcionesCookieSesion } from '../../lib/cookies.js'

const DURACION_COOKIE_SESION_MS = 7 * 24 * 60 * 60 * 1000

function leerCredenciales(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const contrasena = typeof body?.contrasena === 'string' ? body.contrasena : ''

  return { email, contrasena }
}

export function crearRouterAuth(servicio = {
  iniciarSesion,
  obtenerSesionActiva,
  cerrarSesion,
  cambiarContrasenaPropia,
}, { limitarLogin = crearLimitadorIntentosLogin() } = {}) {
  const authRouter = Router()
  const requerirSesion = crearRequerirSesion(servicio)

  authRouter.post('/login', limitarLogin, async (request, response, next) => {
    const { email, contrasena } = leerCredenciales(request.body)

    if (!email || !contrasena || email.length > 255) {
      return response.status(400).json({
        error: {
          code: 'INVALID_CREDENTIALS_FORMAT',
          message: 'Email y contraseña son obligatorios.',
        },
      })
    }

    try {
      const resultado = await servicio.iniciarSesion({ email, contrasena })

      if (!resultado) {
        return response.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email o contraseña incorrectos.',
          },
        })
      }

      response.cookie(
        'sesion_admin',
        resultado.token,
        opcionesCookieSesion({ maxAge: DURACION_COOKIE_SESION_MS }),
      )

      return response.json({
        data: { usuario: resultado.usuario, expiraEn: resultado.expiraEn },
      })
    } catch (error) {
      return next(error)
    }
  })

  authRouter.get('/me', requerirSesion, (request, response) => {
    return response.json({ data: { usuario: request.usuario } })
  })

  authRouter.post('/logout', requerirSesion, async (request, response, next) => {
    try {
      await servicio.cerrarSesion(request.tokenSesion)
      response.clearCookie('sesion_admin', opcionesCookieSesion())
      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  // Cambio de contraseña de la propia cuenta. La sesión identifica al usuario
  // (jamás se recibe el id por el cuerpo). La nueva debe cumplir la política.
  authRouter.patch('/contrasena', requerirSesion, async (request, response, next) => {
    const contrasenaActual =
      typeof request.body?.contrasenaActual === 'string' ? request.body.contrasenaActual : ''
    const contrasenaNueva =
      typeof request.body?.contrasenaNueva === 'string' ? request.body.contrasenaNueva : ''

    if (!contrasenaActual || contrasenaNueva.length < 12 || contrasenaNueva.length > 128) {
      return response.status(422).json({
        error: {
          code: 'INVALID_PASSWORD_DATA',
          message: 'La nueva contraseña debe tener entre 12 y 128 caracteres.',
        },
      })
    }

    try {
      const resultado = await servicio.cambiarContrasenaPropia({
        usuarioId: request.usuario.id,
        contrasenaActual,
        contrasenaNueva,
      })

      if (!resultado.ok) {
        return response.status(400).json({
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'La contraseña actual no es correcta.',
          },
        })
      }

      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  return authRouter
}

export default crearRouterAuth()
