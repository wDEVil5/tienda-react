import { prisma } from '../../lib/prisma.js'

export function crearRepositorioMarcas(cliente = prisma) {
  return {
    // TODAS las marcas cargadas (la góndola es editorial: "marcas con las que
    // trabajamos"), tengan o no productos publicados. Igual devolvemos el conteo
    // de productos publicados por si el front quiere mostrarlo.
    async listarTodas() {
      return cliente.marca.findMany({
        select: {
          id: true,
          nombre: true,
          logoUrl: true,
          brandfetchDomain: true,
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
