import { Router } from 'express'
import {
  ErrorCuenta,
  cerrarSesion,
  iniciarSesion,
  obtenerSesionActiva,
  registrar,
  actualizarPerfil,
  cambiarContrasena,
  cerrarTodasLasSesiones,
} from './cuenta.service.js'
import { crearRequerirCliente } from './cuenta.middleware.js'
import {
  validarActualizacionPerfilCliente,
  validarCambioContrasenaCliente,
  validarRegistroCliente,
} from './cuenta.validacion.js'
import { crearLimitadorIntentosLogin } from '../auth/limite-intentos.js'
import { opcionesCookieSesion } from '../../lib/cookies.js'

const DURACION_COOKIE_SESION_MS = 7 * 24 * 60 * 60 * 1000

// Cookie httpOnly separada de la del staff (`sesion_admin`): un comprador nunca
// obtiene una sesión que sirva en el panel. Las opciones (SameSite/Secure) salen
// del helper compartido para no divergir de la del staff.
function opcionesCookie() {
  return opcionesCookieSesion()
}

function leerCredenciales(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const contrasena = typeof body?.contrasena === 'string' ? body.contrasena : ''
  return { email, contrasena }
}

export function crearRouterCuenta(
  servicio = {
    registrar,
    iniciarSesion,
    obtenerSesionActiva,
    cerrarSesion,
    actualizarPerfil,
    cambiarContrasena,
    cerrarTodasLasSesiones,
  },
  { limitarLogin = crearLimitadorIntentosLogin() } = {},
) {
  const cuentaRouter = Router()
  const requerirCliente = crearRequerirCliente(servicio)

  cuentaRouter.post('/registro', async (request, response, next) => {
    const validacion = validarRegistroCliente(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_ACCOUNT_DATA',
          message: 'Revisa los datos de la cuenta.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      const resultado = await servicio.registrar(validacion.data)
      response.cookie('sesion_cliente', resultado.token, {
        ...opcionesCookie(),
        maxAge: DURACION_COOKIE_SESION_MS,
      })
      return response.status(201).json({
        data: { cliente: resultado.cliente, expiraEn: resultado.expiraEn },
      })
    } catch (error) {
      if (error instanceof ErrorCuenta) {
        return response.status(409).json({
          error: { code: error.code, message: error.message },
        })
      }
      return next(error)
    }
  })

  cuentaRouter.post('/login', limitarLogin, async (request, response, next) => {
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
          error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos.' },
        })
      }

      response.cookie('sesion_cliente', resultado.token, {
        ...opcionesCookie(),
        maxAge: DURACION_COOKIE_SESION_MS,
      })
      return response.json({
        data: { cliente: resultado.cliente, expiraEn: resultado.expiraEn },
      })
    } catch (error) {
      return next(error)
    }
  })

  cuentaRouter.get('/', requerirCliente, (request, response) => {
    return response.json({ data: { cliente: request.cliente } })
  })

  cuentaRouter.patch('/perfil', requerirCliente, async (request, response, next) => {
    const validacion = validarActualizacionPerfilCliente(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_PROFILE_DATA',
          message: 'Revisa los datos de tu perfil.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      // clienteId sale de la cookie ya validada por requerirCliente; el cuerpo
      // no puede apuntar al perfil de otra persona.
      const cliente = await servicio.actualizarPerfil(request.cliente.id, validacion.data)
      return response.json({ data: { cliente } })
    } catch (error) {
      return next(error)
    }
  })

  cuentaRouter.patch('/contrasena', requerirCliente, async (request, response, next) => {
    const validacion = validarCambioContrasenaCliente(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_PASSWORD_CHANGE_DATA',
          message: 'Revisa los datos de la contraseña.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      await servicio.cambiarContrasena(
        request.cliente.id,
        validacion.data,
        request.tokenSesion,
      )
      return response.status(204).end()
    } catch (error) {
      if (error instanceof ErrorCuenta && error.code === 'INVALID_CURRENT_PASSWORD') {
        return response.status(400).json({
          error: { code: error.code, message: error.message },
        })
      }
      return next(error)
    }
  })

  // DELETE expresa que se invalida la colección de sesiones del cliente. Al
  // borrar también la cookie actual, el navegador deberá autenticarse de nuevo.
  cuentaRouter.delete('/sesiones', requerirCliente, async (request, response, next) => {
    try {
      await servicio.cerrarTodasLasSesiones(request.cliente.id)
      response.clearCookie('sesion_cliente', opcionesCookie())
      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  cuentaRouter.post('/logout', requerirCliente, async (request, response, next) => {
    try {
      await servicio.cerrarSesion(request.tokenSesion)
      response.clearCookie('sesion_cliente', opcionesCookie())
      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  return cuentaRouter
}

export default crearRouterCuenta()
