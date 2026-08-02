import { prisma } from '../../lib/prisma.js'

export function crearRepositorioCategorias(cliente = prisma) {
  return {
    async listarConProductosPublicados() {
      return cliente.categoria.findMany({
        where: {
          activa: true,
          productos: { some: { estado: 'PUBLICADO' } },
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          _count: {
            select: {
              productos: { where: { estado: 'PUBLICADO' } },
            },
          },
        },
      })
    },
  }
}

export const repositorioCategorias = crearRepositorioCategorias()
