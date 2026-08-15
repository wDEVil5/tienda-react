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
          // Subcategorías activas para el mega-menú, ya ordenadas (orden, luego
          // nombre). El front las agrupa bajo su categoría.
          subcategorias: {
            where: { activa: true },
            select: { id: true, nombre: true, slug: true },
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
          },
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
