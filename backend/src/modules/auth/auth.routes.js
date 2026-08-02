import { Router } from 'express'
import { cerrarSesion, iniciarSesion, obtenerSesionActiva } from './auth.service.js'
import { crearRequerirSesion } from './auth.middleware.js'

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
}) {
  const authRouter = Router()
  const requerirSesion = crearRequerirSesion(servicio)

  authRouter.post('/login', async (request, response, next) => {
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

      response.cookie('sesion_admin', resultado.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: DURACION_COOKIE_SESION_MS,
        path: '/',
      })

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
      response.clearCookie('sesion_admin', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  return authRouter
}

export default crearRouterAuth()
