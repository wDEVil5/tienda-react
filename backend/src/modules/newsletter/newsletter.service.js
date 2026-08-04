import { repositorioNewsletter } from './newsletter.repository.js'

export class ErrorNewsletter extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function crearServicioNewsletter(repositorio = repositorioNewsletter) {
  return {
    async suscribir({ email, clienteId = null }) {
      const existente = await repositorio.buscarPorEmail(email)
      if (existente) {
        // Ya activo: no duplicamos. Si estaba dado de baja, lo reactivamos: el
        // correo vuelve a la lista sin crear una fila nueva.
        if (existente.estado === 'ACTIVO') {
          throw new ErrorNewsletter('ALREADY_SUBSCRIBED', 'Este correo ya está suscrito.')
        }
        return repositorio.reactivar(existente.id, { clienteId })
      }

      try {
        return await repositorio.crear({ email, clienteId })
      } catch (error) {
        // Carrera: otra petición creó el mismo correo entre buscar y crear.
        if (error.code === 'P2002') {
          throw new ErrorNewsletter('ALREADY_SUBSCRIBED', 'Este correo ya está suscrito.')
        }
        throw error
      }
    },
  }
}

const servicioNewsletter = crearServicioNewsletter()

export const suscribirNewsletter = servicioNewsletter.suscribir
