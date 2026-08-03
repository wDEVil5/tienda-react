import { prisma } from '../../lib/prisma.js'

// Aísla Prisma del servicio de avisos. Recibe el cliente como dependencia para
// poder probar la lógica sin abrir PostgreSQL.
export function crearRepositorioAvisos(db = prisma) {
  return {
    // Solo un producto publicado puede recibir avisos. Traemos lo justo para
    // decidir disponibilidad (stock y reservado), no el producto entero.
    async buscarProductoPublicadoPorSlug(slug) {
      return db.producto.findFirst({
        where: { slug, estado: 'PUBLICADO' },
        select: { id: true, stock: true, stockReservado: true },
      })
    },

    async buscarAviso(productoId, email) {
      return db.avisoStock.findUnique({
        where: { productoId_email: { productoId, email } },
      })
    },

    async crear({ productoId, email, clienteId }) {
      return db.avisoStock.create({
        data: { productoId, email, clienteId },
      })
    },

    // Reactiva un aviso ya notificado (o listo): vuelve a quedar pendiente y se
    // recoloca al final de la fila con una nueva fecha de creación.
    async reactivar(id, { clienteId }) {
      return db.avisoStock.update({
        where: { id },
        data: {
          clienteId,
          listoEn: null,
          notificadoEn: null,
          creadoEn: new Date(),
        },
      })
    },

    // Marca como listos para notificar los avisos pendientes de un producto que
    // volvió a tener stock. Solo toca los que aún no fueron notificados ni
    // marcados: no reenvía a quien ya fue avisado.
    async marcarListosPorProducto(productoId, ahora = new Date()) {
      return db.avisoStock.updateMany({
        where: { productoId, listoEn: null, notificadoEn: null },
        data: { listoEn: ahora },
      })
    },
  }
}

export const repositorioAvisos = crearRepositorioAvisos()
