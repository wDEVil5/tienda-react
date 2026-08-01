import { prisma } from '../../lib/prisma.js'

export function crearRepositorioCategorias(cliente = prisma) {
  return {
    async listarConProductosPublicados() {
      return cliente.categoria.findMany({
        where: {
          activa: true,
          productos: { some: { activo: true } },
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          _count: {
            select: {
              productos: { where: { activo: true } },
            },
          },
        },
      })
    },
  }
}

export const repositorioCategorias = crearRepositorioCategorias()
