import { prisma } from '../../lib/prisma.js'

export function crearRepositorioPromocionesAdmin(cliente = prisma) {
  return {
    obtenerPorId(id) {
      return cliente.promocion.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          slug: true,
          porcentajeDescuento: true,
          empiezaEn: true,
          terminaEn: true,
          activa: true,
          productos: { select: { productoId: true } },
          _count: { select: { productos: true } },
        },
      })
    },

    buscarSolapamientoActivo({ id, empiezaEn, terminaEn, productoIds }) {
      return cliente.promocion.findFirst({
        where: {
          id: { not: id },
          activa: true,
          empiezaEn: { lt: terminaEn },
          terminaEn: { gt: empiezaEn },
          productos: { some: { productoId: { in: productoIds } } },
        },
        select: { id: true, nombre: true },
      })
    },

    actualizarPorId(id, datos) {
      return cliente.promocion.update({
        where: { id },
        data: datos,
        select: {
          id: true,
          nombre: true,
          slug: true,
          porcentajeDescuento: true,
          empiezaEn: true,
          terminaEn: true,
          activa: true,
          _count: { select: { productos: true } },
        },
      })
    },

    crear({ productoIds, ...datos }) {
      return cliente.promocion.create({
        data: {
          ...datos,
          productos: {
            create: productoIds.map((productoId) => ({ producto: { connect: { id: productoId } } })),
          },
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          porcentajeDescuento: true,
          empiezaEn: true,
          terminaEn: true,
          activa: true,
          _count: { select: { productos: true } },
        },
      })
    },

    contarProductos(ids) {
      return cliente.producto.count({ where: { id: { in: ids } } })
    },

    listar() {
      return cliente.promocion.findMany({
        select: {
          id: true,
          nombre: true,
          slug: true,
          porcentajeDescuento: true,
          empiezaEn: true,
          terminaEn: true,
          activa: true,
          _count: { select: { productos: true } },
        },
        orderBy: [{ terminaEn: 'desc' }, { id: 'asc' }],
      })
    },
  }
}

export const repositorioPromocionesAdmin = crearRepositorioPromocionesAdmin()
