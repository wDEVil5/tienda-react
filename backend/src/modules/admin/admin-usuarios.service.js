import { crearHashContrasena } from '../auth/contrasena.js'
import { repositorioUsuariosAdmin } from './admin-usuarios.repository.js'

export class ErrorUsuarioAdmin extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function crearServicioUsuariosAdmin(
  repositorio = repositorioUsuariosAdmin,
  crearHash = crearHashContrasena,
) {
  return {
    async desactivarUsuario(id, solicitadoPorId) {
      const usuario = await repositorio.obtenerPorId(id)
      if (!usuario) return null

      if (usuario.id === solicitadoPorId) {
        throw new ErrorUsuarioAdmin('CANNOT_DEACTIVATE_SELF', 'No puedes desactivar tu propia cuenta.')
      }
      if (usuario.rol === 'ADMIN') {
        throw new ErrorUsuarioAdmin(
          'CANNOT_DEACTIVATE_ADMIN',
          'No puedes desactivar una cuenta administradora desde esta ruta.',
        )
      }

      return repositorio.desactivarPorId(id, new Date())
    },

    async activarUsuario(id) {
      const usuario = await repositorio.obtenerPorId(id)
      if (!usuario) return null

      if (usuario.rol === 'ADMIN') {
        throw new ErrorUsuarioAdmin(
          'CANNOT_MANAGE_ADMIN',
          'Las cuentas administradoras se gestionan fuera de esta ruta.',
        )
      }

      return repositorio.activarPorId(id)
    },

    async restablecerContrasena(id, contrasena) {
      const usuario = await repositorio.obtenerPorId(id)
      if (!usuario) return null

      if (usuario.rol === 'ADMIN') {
        throw new ErrorUsuarioAdmin(
          'CANNOT_MANAGE_ADMIN',
          'Las cuentas administradoras se gestionan fuera de esta ruta.',
        )
      }

      const passwordHash = await crearHash(contrasena)
      return repositorio.actualizarContrasenaPorId(id, passwordHash, new Date())
    },

    async listarUsuarios() {
      const usuarios = await repositorio.listar()
      return { data: usuarios.map((usuario) => ({ ...usuario })) }
    },

    async crearOperador({ nombre, email, contrasena }) {
      const passwordHash = await crearHash(contrasena)
      return repositorio.crear({
        nombre,
        email,
        passwordHash,
        rol: 'OPERADOR',
        activo: true,
      })
    },
  }
}

const servicioUsuariosAdmin = crearServicioUsuariosAdmin()

export const crearOperadorAdmin = servicioUsuariosAdmin.crearOperador
export const listarUsuariosAdmin = servicioUsuariosAdmin.listarUsuarios
export const desactivarUsuarioAdmin = servicioUsuariosAdmin.desactivarUsuario
export const activarUsuarioAdmin = servicioUsuariosAdmin.activarUsuario
export const restablecerContrasenaUsuarioAdmin = servicioUsuariosAdmin.restablecerContrasena
