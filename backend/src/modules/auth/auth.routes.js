import { Router } from 'express'
import { cerrarSesion, iniciarSesion, obtenerSesionActiva } from './auth.service.js'
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

  return authRouter
}

export default crearRouterAuth()
