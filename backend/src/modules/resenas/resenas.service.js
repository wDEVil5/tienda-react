import { repositorioResenas } from './resenas.repository.js'

// Error de dominio de reseñas. La ruta HTTP mapea `code` al estado.
export class ErrorResena extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const ORDENES = new Set(['reciente', 'mejor', 'peor'])

// Mostramos solo el primer nombre del autor (estilo Jumbo), no el nombre completo.
function primerNombre(nombre) {
  return (nombre ?? '').trim().split(/\s+/)[0] || 'Cliente'
}

function crearResenaPublica(resena, clienteId) {
  return {
    id: resena.id,
    calificacion: resena.calificacion,
    titulo: resena.titulo,
    cuerpo: resena.cuerpo,
    autor: primerNombre(resena.cliente?.nombre),
    createdAt: resena.createdAt,
    // Marca la reseña del propio solicitante (para ofrecer editar/borrar).
    esMia: Boolean(clienteId) && resena.clienteId === clienteId,
  }
}

// Promedio a un decimal (ej. 3.4) o null si no hay reseñas.
function resumenAgregado({ resenaSuma, resenaConteo }) {
  return {
    conteo: resenaConteo,
    promedio: resenaConteo > 0 ? Number((resenaSuma / resenaConteo).toFixed(1)) : null,
  }
}

export function crearServicioResenas({ repositorio = repositorioResenas } = {}) {
  return {
    async listar({ productoId, page = 1, limit = 10, orden = 'reciente', clienteId = null }) {
      const ordenValido = ORDENES.has(orden) ? orden : 'reciente'
      const [items, total, agregado] = await Promise.all([
        repositorio.listarPorProducto({ productoId, page, limit, orden: ordenValido }),
        repositorio.contarPorProducto(productoId),
        repositorio.obtenerAgregado(productoId),
      ])
      return {
        data: items.map((resena) => crearResenaPublica(resena, clienteId)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          ...resumenAgregado(agregado),
        },
      }
    },

    // Elegibilidad + reseña propia, para el formulario "Calificar producto".
    async estadoParaCliente({ productoId, clienteId }) {
      const [puedeResenar, resena] = await Promise.all([
        repositorio.clienteCompro(productoId, clienteId),
        repositorio.obtenerDeCliente(productoId, clienteId),
      ])
      return { puedeResenar, resena }
    },

    async guardar({ productoId, clienteId, calificacion, titulo = null, cuerpo = null }) {
      // Compra verificada: la regla clave del sistema.
      const compro = await repositorio.clienteCompro(productoId, clienteId)
      if (!compro) {
        throw new ErrorResena('PURCHASE_REQUIRED', 'Solo puedes reseñar productos que compraste.')
      }
      const resena = await repositorio.guardarConAgregado({ productoId, clienteId, calificacion, titulo, cuerpo })
      return {
        id: resena.id,
        calificacion: resena.calificacion,
        titulo: resena.titulo,
        cuerpo: resena.cuerpo,
      }
    },

    async eliminarPropia({ id, clienteId }) {
      const productoId = await repositorio.eliminarPropiaConAgregado(id, clienteId)
      return { eliminada: Boolean(productoId) }
    },

    async eliminarComoAdmin({ id }) {
      const productoId = await repositorio.eliminarPorIdConAgregado(id)
      return { eliminada: Boolean(productoId) }
    },

    // Moderación: lista paginada de las reseñas más recientes del catálogo.
    async listarParaAdmin({ page = 1, limit = 20 } = {}) {
      const [items, total] = await Promise.all([
        repositorio.listarRecientes({ page, limit }),
        repositorio.contarTodas(),
      ])
      return {
        data: items.map((resena) => ({
          id: resena.id,
          calificacion: resena.calificacion,
          titulo: resena.titulo,
          cuerpo: resena.cuerpo,
          autor: resena.cliente?.nombre ?? 'Cliente',
          producto: resena.producto
            ? { nombre: resena.producto.nombre, slug: resena.producto.slug }
            : null,
          createdAt: resena.createdAt,
        })),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      }
    },
  }
}

export const servicioResenas = crearServicioResenas()

// Adaptadores para la inyección de dependencias del router de admin.
export const listarResenasAdmin = (opciones) => servicioResenas.listarParaAdmin(opciones)
export const eliminarResenaAdmin = (id) => servicioResenas.eliminarComoAdmin({ id })
