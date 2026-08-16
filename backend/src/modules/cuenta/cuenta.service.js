import { repositorioCuenta } from './cuenta.repository.js'
import { verificadorGooglePorDefecto } from './cuenta.google.js'
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

export function crearServicioCuenta(
  repositorio = repositorioCuenta,
  { verificarGoogle = verificadorGooglePorDefecto } = {},
) {
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

      // Respuesta idéntica ante correo inexistente, cuenta sin contraseña
      // (solo-Google) o clave incorrecta: no revelamos qué cuentas existen ni por
      // qué método se crearon.
      if (
        !cliente ||
        cliente.passwordHash == null ||
        !(await verificarContrasena(cliente.passwordHash, contrasena))
      ) {
        return null
      }

      return abrirSesion(cliente, ahora)
    },

    // Login con Google: verifica el ID token, y busca-crea-o-fusiona la cuenta.
    // Desemboca en la MISMA sesión (cookie sesion_cliente) que el login normal.
    async iniciarConGoogle({ idToken }, ahora = new Date()) {
      if (!idToken) {
        throw new ErrorCuenta('INVALID_GOOGLE_TOKEN', 'Falta el token de Google.')
      }

      let datos
      try {
        datos = await verificarGoogle(idToken)
      } catch {
        // Firma inválida, token expirado o audience equivocada: todo cae aquí.
        throw new ErrorCuenta('INVALID_GOOGLE_TOKEN', 'No pudimos validar tu cuenta de Google.')
      }

      if (!datos.email || !datos.emailVerificado) {
        throw new ErrorCuenta(
          'GOOGLE_EMAIL_UNVERIFIED',
          'Tu correo de Google no está verificado.',
        )
      }

      // 1. ¿Ya enlazada por googleId? Es un cliente que vuelve.
      const porGoogle = await repositorio.buscarClienteActivoPorGoogleId(datos.googleId)
      if (porGoogle) return abrirSesion(porGoogle, ahora)

      // 2. ¿Existe una cuenta con ese correo? Fusionamos: le enlazamos el googleId.
      const porEmail = await repositorio.buscarClienteActivoPorEmail(datos.email)
      if (porEmail) {
        const enlazado = await repositorio.enlazarGoogle(porEmail.id, datos.googleId)
        return abrirSesion(enlazado, ahora)
      }

      // 3. Nadie: creamos una cuenta nueva solo-Google (sin contraseña).
      let cliente
      try {
        cliente = await repositorio.crearClienteGoogle({
          nombre: datos.nombre,
          email: datos.email,
          googleId: datos.googleId,
        })
      } catch (error) {
        // Carrera o correo de una cuenta inactiva (email es único global): no
        // podemos abrir sesión sin invadir esa cuenta.
        if (error.code === 'P2002') {
          throw new ErrorCuenta('EMAIL_TAKEN', 'Ese correo ya está en uso.')
        }
        throw error
      }

      return abrirSesion(cliente, ahora)
    },

    async actualizarPerfil(clienteId, datos) {
      const cliente = await repositorio.actualizarPerfilCliente(clienteId, datos)
      return crearClientePublico(cliente)
    },

    async cambiarContrasena(
      clienteId,
      { contrasenaActual, contrasenaNueva },
      tokenSesion,
      ahora = new Date(),
    ) {
      const cliente = await repositorio.buscarClienteActivoPorId(clienteId)

      // No devolvemos qué parte falló: aun con sesión válida, evitamos dar una
      // pista útil si alguien tomó un navegador desbloqueado. Una cuenta solo-Google
      // (sin passwordHash) no tiene contraseña actual: usa "recuperar contraseña".
      if (
        !cliente ||
        cliente.passwordHash == null ||
        !(await verificarContrasena(cliente.passwordHash, contrasenaActual))
      ) {
        throw new ErrorCuenta('INVALID_CURRENT_PASSWORD', 'La contraseña actual no es correcta.')
      }

      const passwordHash = await crearHashContrasena(contrasenaNueva)
      await repositorio.actualizarContrasenaYRevocarOtrasSesiones({
        clienteId,
        passwordHash,
        tokenHashActual: hashTokenSesion(tokenSesion),
        ahora,
      })
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

    cerrarTodasLasSesiones(clienteId, ahora = new Date()) {
      return repositorio.revocarTodasLasSesiones(clienteId, ahora)
    },

    eliminarCuenta(clienteId) {
      return repositorio.eliminarCliente(clienteId)
    },
  }
}

const servicioCuenta = crearServicioCuenta()

export const registrar = servicioCuenta.registrar
export const iniciarSesion = servicioCuenta.iniciarSesion
export const iniciarConGoogle = servicioCuenta.iniciarConGoogle
export const obtenerSesionActiva = servicioCuenta.obtenerSesionActiva
export const cerrarSesion = servicioCuenta.cerrarSesion
export const actualizarPerfil = servicioCuenta.actualizarPerfil
export const cambiarContrasena = servicioCuenta.cambiarContrasena
export const cerrarTodasLasSesiones = servicioCuenta.cerrarTodasLasSesiones
export const eliminarCuenta = servicioCuenta.eliminarCuenta
