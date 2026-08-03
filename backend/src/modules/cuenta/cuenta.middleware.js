import { obtenerSesionActiva } from './cuenta.service.js'

// Lee una cookie por nombre desde el header. Igual que en la auth del staff;
// se duplica a propósito para que el módulo cuenta sea independiente.
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

// Exige una sesión de CLIENTE válida (cookie `sesion_cliente`, distinta de la
// del staff). Nunca confía en datos del cuerpo: la identidad sale de la sesión
// verificada en PostgreSQL.
export function crearRequerirCliente(servicio = { obtenerSesionActiva }) {
  return async (request, response, next) => {
    try {
      const token = leerCookie(request.headers.cookie, 'sesion_cliente')
      const sesion = await servicio.obtenerSesionActiva(token)

      if (!sesion) {
        return response.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Inicia sesión en tu cuenta para continuar.',
          },
        })
      }

      request.cliente = sesion.cliente
      // El logout lo usa para revocar exactamente esta sesión.
      request.tokenSesion = token
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export const requerirCliente = crearRequerirCliente()

// Variante OPCIONAL: adjunta request.cliente si hay una sesión válida, pero
// nunca bloquea. Para rutas públicas que se enriquecen si el comprador está
// logueado (p. ej. enlazar el pedido a su cuenta) sin exigir login: el invitado
// pasa igual.
export function crearClienteOpcional(servicio = { obtenerSesionActiva }) {
  return async (request, _response, next) => {
    try {
      const token = leerCookie(request.headers.cookie, 'sesion_cliente')
      const sesion = token ? await servicio.obtenerSesionActiva(token) : null
      if (sesion) request.cliente = sesion.cliente
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export const clienteOpcional = crearClienteOpcional()
