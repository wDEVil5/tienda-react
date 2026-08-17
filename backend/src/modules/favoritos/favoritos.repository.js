import { prisma } from '../../lib/prisma.js'

// Acceso a la tabla `favoritos` (lista de deseos del cliente). Cliente
// inyectable para probar sin BD, igual que el resto de los repositorios.
export function crearRepositorioFavoritos(db = prisma) {
  return {
    // Ids de los productos favoritos del cliente, más nuevos primero. La
    // hidratación a tarjetas la hace el repo de productos (una sola fuente del
    // mapper público), no este.
    async listarProductoIds(clienteId) {
      const filas = await db.favorito.findMany({
        where: { clienteId },
        orderBy: { createdAt: 'desc' },
        select: { productoId: true },
      })
      return filas.map((fila) => fila.productoId)
    },

    // Alta idempotente: un upsert por la clave única (cliente, producto). Volver
    // a favoritar algo ya favorito no duplica ni falla.
    async agregar(clienteId, productoId) {
      await db.favorito.upsert({
        where: { clienteId_productoId: { clienteId, productoId } },
        create: { clienteId, productoId },
        update: {},
      })
    },

    // Baja idempotente: quitar algo que no está no es un error.
    async quitar(clienteId, productoId) {
      await db.favorito.deleteMany({ where: { clienteId, productoId } })
    },

    // ¿El producto existe y está publicado? Guarda para no favoritar fantasmas
    // ni productos archivados (que nunca aparecerían en la lista).
    async existeProductoPublicado(productoId) {
      const producto = await db.producto.findFirst({
        where: { id: productoId, estado: 'PUBLICADO' },
        select: { id: true },
      })
      return Boolean(producto)
    },
  }
}

export const repositorioFavoritos = crearRepositorioFavoritos()
