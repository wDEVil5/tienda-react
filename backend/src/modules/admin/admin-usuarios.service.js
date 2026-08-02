import { crearHashContrasena } from '../auth/contrasena.js'
import { repositorioUsuariosAdmin } from './admin-usuarios.repository.js'

export function crearServicioUsuariosAdmin(
  repositorio = repositorioUsuariosAdmin,
  crearHash = crearHashContrasena,
) {
  return {
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
