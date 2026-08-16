import { repositorioNewsletter } from './newsletter.repository.js'
import { notificadorNewsletter } from './newsletter.notificaciones.js'

export class ErrorNewsletter extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function crearServicioNewsletter(
  repositorio = repositorioNewsletter,
  { notificador = notificadorNewsletter } = {},
) {
  return {
    async suscribir({ email, clienteId = null }) {
      const existente = await repositorio.buscarPorEmail(email)

      let suscriptor
      if (existente) {
        // Ya activo: no duplicamos. Si estaba dado de baja, lo reactivamos: el
        // correo vuelve a la lista sin crear una fila nueva.
        if (existente.estado === 'ACTIVO') {
          throw new ErrorNewsletter('ALREADY_SUBSCRIBED', 'Este correo ya está suscrito.')
        }
        suscriptor = await repositorio.reactivar(existente.id, { clienteId })
      } else {
        try {
          suscriptor = await repositorio.crear({ email, clienteId })
        } catch (error) {
          // Carrera: otra petición creó el mismo correo entre buscar y crear.
          if (error.code === 'P2002') {
            throw new ErrorNewsletter('ALREADY_SUBSCRIBED', 'Este correo ya está suscrito.')
          }
          throw error
        }
      }

      // Bienvenida por correo, fire-and-forget: la suscripción no debe fallar ni
      // demorarse si el proveedor de correo está caído. Un fallo se registra.
      notificador
        .enviarBienvenida(suscriptor)
        .catch((error) =>
          console.error(`No se pudo enviar la bienvenida a ${email}: ${error.message}`),
        )

      return suscriptor
    },

    async darDeBaja({ token }) {
      const suscriptor = await repositorio.darDeBaja(token)
      if (!suscriptor) {
        throw new ErrorNewsletter('SUBSCRIPTION_NOT_FOUND', 'No encontramos esa suscripción.')
      }
      return suscriptor
    },

    // ¿El correo está suscrito y activo? Lo consulta la preferencia de la cuenta.
    async obtenerEstadoSuscripcion(email) {
      const suscriptor = await repositorio.buscarPorEmail(email)
      return suscriptor?.estado === 'ACTIVO'
    },

    // Preferencia idempotente desde la cuenta: activar o dar de baja por email,
    // sin lanzar si ya estaba en ese estado (a diferencia de `suscribir`).
    async establecerSuscripcion({ email, clienteId = null, activo }) {
      const existente = await repositorio.buscarPorEmail(email)

      if (activo) {
        if (existente?.estado === 'ACTIVO') return existente
        const suscriptor = existente
          ? await repositorio.reactivar(existente.id, { clienteId })
          : await repositorio.crear({ email, clienteId })
        notificador
          .enviarBienvenida(suscriptor)
          .catch((error) => console.error(`No se pudo enviar la bienvenida a ${email}: ${error.message}`))
        return suscriptor
      }

      if (existente?.estado === 'ACTIVO') {
        return repositorio.darDeBajaPorEmail(email)
      }
      return existente ?? null
    },
  }
}

const servicioNewsletter = crearServicioNewsletter()

export const suscribirNewsletter = servicioNewsletter.suscribir
export const darDeBajaNewsletter = servicioNewsletter.darDeBaja
export const obtenerEstadoSuscripcion = servicioNewsletter.obtenerEstadoSuscripcion
export const establecerSuscripcion = servicioNewsletter.establecerSuscripcion
