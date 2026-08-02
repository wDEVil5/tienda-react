import { prisma } from '../../lib/prisma.js'

export function crearRepositorioPromocionesAdmin(cliente = prisma) {
  return {
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
