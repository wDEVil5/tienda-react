import { repositorioFavoritos } from './favoritos.repository.js'
import { repositorioProductos } from '../productos/productos.repository.js'

// Error de dominio de favoritos. La ruta HTTP mapea `code` al estado.
export class ErrorFavorito extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// Un productoId que no es UUID no puede existir: se trata como "no encontrado"
// sin llegar a la base (Prisma lanzaría con un uuid mal formado).
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function crearServicioFavoritos({
  repositorio = repositorioFavoritos,
  productos = repositorioProductos,
} = {}) {
  return {
    // Favoritos como tarjetas de producto (solo publicados), más nuevo primero.
    // Devuelve también `ids` para que el frontend hidrate los corazones sin otra
    // consulta (los ids incluyen incluso favoritos no publicados, para que el
    // corazón siga marcado si el producto vuelve a publicarse).
    async listar(clienteId) {
      const ids = await repositorio.listarProductoIds(clienteId)
      const data = await productos.listarPublicosPorIds(ids)
      return { data, ids }
    },

    // Solo los ids (barato): hidrata el estado de los corazones al cargar la app.
    async listarIds(clienteId) {
      return repositorio.listarProductoIds(clienteId)
    },

    async agregar(clienteId, productoId) {
      if (!ES_UUID.test(productoId) || !(await repositorio.existeProductoPublicado(productoId))) {
        throw new ErrorFavorito('PRODUCT_NOT_FOUND', 'No encontramos el producto.')
      }
      await repositorio.agregar(clienteId, productoId)
      return { agregado: true }
    },

    async quitar(clienteId, productoId) {
      // Quitar es idempotente y no valida existencia: si el producto ya no está,
      // igual limpiamos cualquier fila del cliente. Un id no-UUID no puede tener
      // fila, así que se ignora en silencio.
      if (ES_UUID.test(productoId)) {
        await repositorio.quitar(clienteId, productoId)
      }
      return { quitado: true }
    },
  }
}

export const servicioFavoritos = crearServicioFavoritos()
