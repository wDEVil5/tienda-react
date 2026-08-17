import { prisma } from '../../lib/prisma.js'

// Orden de la lista pública. "mejor"/"peor" desempatan por fecha.
const ORDEN = {
  reciente: [{ createdAt: 'desc' }],
  mejor: [{ calificacion: 'desc' }, { createdAt: 'desc' }],
  peor: [{ calificacion: 'asc' }, { createdAt: 'desc' }],
}

// Un pedido que pasó de PENDIENTE y no se canceló prueba que el cliente compró
// el producto (pago aprobado o posterior). Es la base de la "compra verificada".
const ESTADOS_COMPRA = ['PREPARANDO', 'LISTO_PARA_RETIRO', 'ENVIADO', 'ENTREGADO']

// Recalcula el agregado denormalizado (suma + conteo) del producto tras cualquier
// cambio en sus reseñas. Corre dentro de la misma transacción que el cambio.
async function recomputarAgregado(tx, productoId) {
  const agregado = await tx.resena.aggregate({
    where: { productoId },
    _sum: { calificacion: true },
    _count: true,
  })
  await tx.producto.update({
    where: { id: productoId },
    data: {
      resenaSuma: agregado._sum.calificacion ?? 0,
      resenaConteo: agregado._count ?? 0,
    },
  })
}

export function crearRepositorioResenas(db = prisma) {
  return {
    async obtenerAgregado(productoId) {
      const producto = await db.producto.findUnique({
        where: { id: productoId },
        select: { resenaSuma: true, resenaConteo: true },
      })
      return producto ?? { resenaSuma: 0, resenaConteo: 0 }
    },

    async listarPorProducto({ productoId, page = 1, limit = 10, orden = 'reciente' }) {
      return db.resena.findMany({
        where: { productoId },
        orderBy: ORDEN[orden] ?? ORDEN.reciente,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          calificacion: true,
          titulo: true,
          cuerpo: true,
          createdAt: true,
          clienteId: true,
          cliente: { select: { nombre: true } },
        },
      })
    },

    async contarPorProducto(productoId) {
      return db.resena.count({ where: { productoId } })
    },

    // Moderación: reseñas más recientes de TODO el catálogo, con su producto y
    // autor (nombre completo, es vista interna).
    async listarRecientes({ page = 1, limit = 20 }) {
      return db.resena.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          calificacion: true,
          titulo: true,
          cuerpo: true,
          createdAt: true,
          cliente: { select: { nombre: true } },
          producto: { select: { nombre: true, slug: true } },
        },
      })
    },

    async contarTodas() {
      return db.resena.count()
    },

    async obtenerDeCliente(productoId, clienteId) {
      return db.resena.findUnique({
        where: { productoId_clienteId: { productoId, clienteId } },
        select: { id: true, calificacion: true, titulo: true, cuerpo: true, createdAt: true, updatedAt: true },
      })
    },

    // ¿El cliente compró el producto? (al menos un ítem en un pedido suyo pagado)
    async clienteCompro(productoId, clienteId) {
      const item = await db.itemPedido.findFirst({
        where: { productoId, pedido: { clienteId, estado: { in: ESTADOS_COMPRA } } },
        select: { id: true },
      })
      return Boolean(item)
    },

    // Upsert (una por cliente/producto) + recompute del agregado, atómico.
    async guardarConAgregado({ productoId, clienteId, calificacion, titulo, cuerpo }) {
      return db.$transaction(async (tx) => {
        const resena = await tx.resena.upsert({
          where: { productoId_clienteId: { productoId, clienteId } },
          create: { productoId, clienteId, calificacion, titulo, cuerpo },
          update: { calificacion, titulo, cuerpo },
        })
        await recomputarAgregado(tx, productoId)
        return resena
      })
    },

    // Borra la reseña del cliente (guarda por dueño) + recompute. Devuelve el
    // productoId afectado, o null si no existía o no era de ese cliente.
    async eliminarPropiaConAgregado(id, clienteId) {
      return db.$transaction(async (tx) => {
        const resena = await tx.resena.findUnique({
          where: { id },
          select: { productoId: true, clienteId: true },
        })
        if (!resena || resena.clienteId !== clienteId) return null
        await tx.resena.delete({ where: { id } })
        await recomputarAgregado(tx, resena.productoId)
        return resena.productoId
      })
    },

    // Igual, pero sin guarda de dueño: moderación del admin.
    async eliminarPorIdConAgregado(id) {
      return db.$transaction(async (tx) => {
        const resena = await tx.resena.findUnique({ where: { id }, select: { productoId: true } })
        if (!resena) return null
        await tx.resena.delete({ where: { id } })
        await recomputarAgregado(tx, resena.productoId)
        return resena.productoId
      })
    },
  }
}

export const repositorioResenas = crearRepositorioResenas()
