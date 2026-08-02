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
      // La ruta de logout lo usa para revocar exactamente la misma sesión.
      request.tokenSesion = token
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export const requerirSesion = crearRequerirSesion()

// Este middleware siempre se usa después de requerirSesion: el rol viene de
// la sesión validada en PostgreSQL, nunca de un campo enviado por el cliente.
export function requerirRoles(...rolesPermitidos) {
  return (request, response, next) => {
    if (!request.usuario || !rolesPermitidos.includes(request.usuario.rol)) {
      return response.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para realizar esta acción.',
        },
      })
    }

    return next()
  }
}
