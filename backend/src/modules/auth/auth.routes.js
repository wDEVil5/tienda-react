import { Router } from 'express'
import { iniciarSesion } from './auth.service.js'

const DURACION_COOKIE_SESION_MS = 7 * 24 * 60 * 60 * 1000

function leerCredenciales(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const contrasena = typeof body?.contrasena === 'string' ? body.contrasena : ''

  return { email, contrasena }
}

export function crearRouterAuth(servicio = { iniciarSesion }) {
  const authRouter = Router()

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

  return authRouter
}

export default crearRouterAuth()
