import { repositorioAuth } from './auth.repository.js'
import { crearHashContrasena, verificarContrasena } from './contrasena.js'
import {
  crearTokenSesion,
  crearVencimientoSesion,
  hashTokenSesion,
} from './sesion.js'

function crearUsuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  }
}

export function crearServicioAuth(repositorio = repositorioAuth) {
  return {
    async iniciarSesion({ email, contrasena, ahora = new Date() }) {
      const usuario = await repositorio.buscarUsuarioActivoPorEmail(email)

      // La respuesta es idéntica para correo inexistente, usuario inactivo o
      // clave incorrecta: así no revelamos qué cuentas están registradas.
      if (!usuario || !(await verificarContrasena(usuario.passwordHash, contrasena))) {
        return null
      }

      const token = crearTokenSesion()
      const expiraEn = crearVencimientoSesion(ahora)
      await repositorio.crearSesion({
        usuarioId: usuario.id,
        tokenHash: hashTokenSesion(token),
        expiraEn,
      })

      return { token, expiraEn, usuario: crearUsuarioPublico(usuario) }
    },

    async obtenerSesionActiva(token, ahora = new Date()) {
      if (!token) return null

      const sesion = await repositorio.buscarSesionActivaPorHash(
        hashTokenSesion(token),
        ahora,
      )

      return sesion ? { usuario: crearUsuarioPublico(sesion.usuario) } : null
    },

    cerrarSesion(token, ahora = new Date()) {
      if (!token) return Promise.resolve()

      return repositorio.revocarSesionPorHash(hashTokenSesion(token), ahora)
    },

    // Cambio de contraseña self-service: exige la contraseña actual antes de
    // fijar la nueva (así una sesión secuestrada no puede cambiarla a ciegas).
    // Devuelve { ok } para que la ruta traduzca el fallo sin filtrar detalles.
    async cambiarContrasenaPropia({ usuarioId, contrasenaActual, contrasenaNueva }) {
      const usuario = await repositorio.buscarUsuarioActivoPorId(usuarioId)
      if (!usuario || !(await verificarContrasena(usuario.passwordHash, contrasenaActual))) {
        return { ok: false }
      }

      const passwordHash = await crearHashContrasena(contrasenaNueva)
      await repositorio.actualizarContrasena(usuarioId, passwordHash)
      return { ok: true }
    },
  }
}

const servicioAuth = crearServicioAuth()

export const iniciarSesion = servicioAuth.iniciarSesion
export const obtenerSesionActiva = servicioAuth.obtenerSesionActiva
export const cerrarSesion = servicioAuth.cerrarSesion
export const cambiarContrasenaPropia = servicioAuth.cambiarContrasenaPropia
