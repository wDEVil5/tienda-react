import { repositorioAvisos } from './avisos.repository.js'
import { calcularDisponible } from '../../lib/estadoStock.js'

export class ErrorAviso extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function crearServicioAvisos(repositorio = repositorioAvisos) {
  return {
    async suscribir({ slug, email, clienteId = null }) {
      const producto = await repositorio.buscarProductoPublicadoPorSlug(slug)
      if (!producto) {
        throw new ErrorAviso('PRODUCT_NOT_FOUND', 'No encontramos el producto solicitado.')
      }

      // "Avísame" solo tiene sentido si está agotado: si hay stock, que compre.
      if (calcularDisponible(producto) > 0) {
        throw new ErrorAviso('PRODUCT_AVAILABLE', 'Este producto tiene stock disponible.')
      }

      const existente = await repositorio.buscarAviso(producto.id, email)
      if (existente) {
        // Ya pendiente: no duplicamos ni lo recolocamos en la fila.
        if (!existente.notificadoEn && !existente.listoEn) {
          throw new ErrorAviso('ALREADY_SUBSCRIBED', 'Ya te avisaremos cuando vuelva a haber stock.')
        }
        // Fue notificado (o quedó listo) antes y se agotó otra vez: reactivamos.
        return repositorio.reactivar(existente.id, { clienteId })
      }

      try {
        return await repositorio.crear({ productoId: producto.id, email, clienteId })
      } catch (error) {
        // Carrera: otra petición creó el mismo aviso entre buscar y crear.
        if (error.code === 'P2002') {
          throw new ErrorAviso('ALREADY_SUBSCRIBED', 'Ya te avisaremos cuando vuelva a haber stock.')
        }
        throw error
      }
    },
  }
}

const servicioAvisos = crearServicioAvisos()

export const suscribirAviso = servicioAvisos.suscribir
