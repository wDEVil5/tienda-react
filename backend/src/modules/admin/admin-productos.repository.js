import { prisma } from '../../lib/prisma.js'

export function crearRepositorioProductosAdmin(cliente = prisma) {
  return {
    obtenerPorId(id) {
      return cliente.producto.findUnique({
        where: { id },
        include: {
          categoria: true,
          marca: true,
          imagenes: { orderBy: { orden: 'asc' } },
          etiquetas: { include: { etiqueta: true } },
        },
      })
    },
  }
}

export const repositorioProductosAdmin = crearRepositorioProductosAdmin()
