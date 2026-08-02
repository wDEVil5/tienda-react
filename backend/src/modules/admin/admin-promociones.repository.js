import { prisma } from '../../lib/prisma.js'

export function crearRepositorioPromocionesAdmin(cliente = prisma) {
  return {
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
