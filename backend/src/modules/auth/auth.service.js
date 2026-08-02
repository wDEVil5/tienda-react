import { repositorioAuth } from './auth.repository.js'
import { verificarContrasena } from './contrasena.js'
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
  }
}

const servicioAuth = crearServicioAuth()

export const iniciarSesion = servicioAuth.iniciarSesion
export const obtenerSesionActiva = servicioAuth.obtenerSesionActiva
