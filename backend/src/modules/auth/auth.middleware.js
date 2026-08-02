import { obtenerSesionActiva } from './auth.service.js'

function leerCookie(cookieHeader, nombre) {
  if (!cookieHeader) return null

  const valor = cookieHeader
    .split(';')
    .map((fragmento) => fragmento.trim())
    .find((fragmento) => fragmento.startsWith(`${nombre}=`))
    ?.slice(nombre.length + 1)

  if (!valor) return null

  try {
    return decodeURIComponent(valor)
  } catch {
    return null
  }
}

export function crearRequerirSesion(servicio = { obtenerSesionActiva }) {
  return async (request, response, next) => {
    try {
      const token = leerCookie(request.headers.cookie, 'sesion_admin')
      const sesion = await servicio.obtenerSesionActiva(token)

      if (!sesion) {
        return response.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Debes iniciar sesión para continuar.',
          },
        })
      }

      request.usuario = sesion.usuario
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export const requerirSesion = crearRequerirSesion()
