import { prisma } from '../../lib/prisma.js'

export function crearRepositorioCategoriasAdmin(cliente = prisma) {
  return {
    listar() {
      return cliente.categoria.findMany({
        select: {
          id: true,
          nombre: true,
          slug: true,
          activa: true,
          _count: { select: { productos: true } },
        },
        orderBy: { nombre: 'asc' },
      })
    },

    crear(datos) {
      return cliente.categoria.create({
        data: datos,
        select: { id: true, nombre: true, slug: true, activa: true },
      })
    },
  }
}

export const repositorioCategoriasAdmin = crearRepositorioCategoriasAdmin()
