import { prisma } from '../../lib/prisma.js'

export function crearRepositorioMarcas(cliente = prisma) {
  return {
    async listarConProductosPublicados() {
      return cliente.marca.findMany({
        where: {
          productos: { some: { estado: 'PUBLICADO' } },
        },
        select: {
          id: true,
          nombre: true,
          logoUrl: true,
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

export const repositorioMarcas = crearRepositorioMarcas()
