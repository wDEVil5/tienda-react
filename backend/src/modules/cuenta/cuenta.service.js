import { repositorioCuenta } from './cuenta.repository.js'
import { crearHashContrasena, verificarContrasena } from '../auth/contrasena.js'
import {
  crearTokenSesion,
  crearVencimientoSesion,
  hashTokenSesion,
} from '../auth/sesion.js'

// Error de negocio de la cuenta (p. ej. correo ya registrado). La ruta lo
// traduce a un 409; cualquier otro error sube al manejador general.
export class ErrorCuenta extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// Nunca exponemos passwordHash ni banderas internas al cliente.
function crearClientePublico(cliente) {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.telefono,
  }
}

export function crearServicioCuenta(repositorio = repositorioCuenta) {
  // El token viaja una sola vez al navegador; la base guarda solo su hash.
  async function abrirSesion(cliente, ahora) {
    const token = crearTokenSesion()
    const expiraEn = crearVencimientoSesion(ahora)
    await repositorio.crearSesion({
      clienteId: cliente.id,
      tokenHash: hashTokenSesion(token),
      expiraEn,
    })
    return { token, expiraEn, cliente: crearClientePublico(cliente) }
  }

  return {
    async registrar({ nombre, email, contrasena, telefono }, ahora = new Date()) {
      if (await repositorio.buscarClienteActivoPorEmail(email)) {
        throw new ErrorCuenta('EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.')
      }

      const passwordHash = await crearHashContrasena(contrasena)

      let cliente
      try {
        cliente = await repositorio.crearCliente({
          nombre,
          email,
          passwordHash,
          telefono: telefono ?? null,
        })
      } catch (error) {
        // Carrera: dos registros simultáneos con el mismo correo chocan con el
        // @unique. Se traduce al mismo error de negocio.
        if (error.code === 'P2002') {
          throw new ErrorCuenta('EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.')
        }
        throw error
      }

      return abrirSesion(cliente, ahora)
    },

    async iniciarSesion({ email, contrasena, ahora = new Date() }) {
      const cliente = await repositorio.buscarClienteActivoPorEmail(email)

      // Respuesta idéntica ante correo inexistente o clave incorrecta: no
      // revelamos qué cuentas existen.
      if (!cliente || !(await verificarContrasena(cliente.passwordHash, contrasena))) {
        return null
      }

      return abrirSesion(cliente, ahora)
    },

    async obtenerSesionActiva(token, ahora = new Date()) {
      if (!token) return null

      const sesion = await repositorio.buscarSesionActivaPorHash(
        hashTokenSesion(token),
        ahora,
      )

      return sesion ? { cliente: crearClientePublico(sesion.cliente) } : null
    },

    cerrarSesion(token, ahora = new Date()) {
      if (!token) return Promise.resolve()
      return repositorio.revocarSesionPorHash(hashTokenSesion(token), ahora)
    },
  }
}

const servicioCuenta = crearServicioCuenta()

export const registrar = servicioCuenta.registrar
export const iniciarSesion = servicioCuenta.iniciarSesion
export const obtenerSesionActiva = servicioCuenta.obtenerSesionActiva
export const cerrarSesion = servicioCuenta.cerrarSesion
