import { crearHashContrasena } from '../auth/contrasena.js'
import { repositorioRecuperacion } from './recuperacion.repository.js'
import {
  crearTokenRecuperacion,
  crearVencimientoRecuperacion,
  hashTokenRecuperacion,
} from './recuperacion.token.js'

export class ErrorRecuperacion extends Error {
  constructor(codigo, mensaje) {
    super(mensaje)
    this.codigo = codigo
  }
}

// Servicio de recuperación de contraseña, AGNÓSTICO del dominio. Recibe un
// `dominio` (adaptador de clientes o de staff) que expone:
//   - buscarActivoPorEmail(email) -> { id, nombre, email } | null
//   - campoTitular: 'clienteId' | 'usuarioId'  (qué FK del token llenar)
//   - restablecerContrasena({ id, passwordHash, ahora })  (persiste + revoca sesiones)
// y un `notificador` con enviarEnlace({ para, nombre, token }). Así el mismo
// núcleo sirve a los dos dominios con solo cambiar el cableado.
export function crearServicioRecuperacion({
  dominio,
  notificador,
  repositorio = repositorioRecuperacion,
  hashContrasena = crearHashContrasena,
  ttlMinutos = 60,
} = {}) {
  return {
    // Genera un token, guarda su HASH y manda el correo con el enlace. Responde
    // SIEMPRE igual, exista o no el correo: no revela qué direcciones están
    // registradas (evita enumeración de cuentas).
    async solicitar({ email, ahora = new Date() }) {
      const sujeto = await dominio.buscarActivoPorEmail(email)
      if (sujeto) {
        const token = crearTokenRecuperacion()
        await repositorio.crearToken({
          tokenHash: hashTokenRecuperacion(token),
          expiraEn: crearVencimientoRecuperacion(ahora, ttlMinutos),
          [dominio.campoTitular]: sujeto.id,
        })
        await notificador.enviarEnlace({ para: sujeto.email, nombre: sujeto.nombre, token })
      }
      return { enviado: true }
    },

    // Valida el token (vigente, sin usar y del dominio correcto), cambia la
    // contraseña, marca el token usado y deja que el dominio revoque las sesiones.
    // El orden (cambiar → marcar usado) evita "quemar" el token si algo falla.
    async restablecer({ token, contrasenaNueva, ahora = new Date() }) {
      const registro = await repositorio.buscarTokenVigentePorHash(
        hashTokenRecuperacion(token),
        ahora,
      )
      const titularId = registro?.[dominio.campoTitular]
      if (!registro || !titularId) {
        throw new ErrorRecuperacion('INVALID_TOKEN', 'El enlace no es válido o ya expiró.')
      }

      const passwordHash = await hashContrasena(contrasenaNueva)
      await dominio.restablecerContrasena({ id: titularId, passwordHash, ahora })
      await repositorio.marcarUsado(registro.id, ahora)
      return { restablecido: true }
    },
  }
}
