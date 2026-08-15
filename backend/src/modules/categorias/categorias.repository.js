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
          // Taxonomía activa para el mega-menú. Las hijas son el tercer nivel y
          // se entregan anidadas, de modo que el frontend no invente jerarquías.
          subcategorias: {
            where: { activa: true },
            select: {
              id: true,
              nombre: true,
              slug: true,
              subcategoriasHijas: {
                where: { activa: true },
                select: { id: true, nombre: true, slug: true },
                orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
              },
            },
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
