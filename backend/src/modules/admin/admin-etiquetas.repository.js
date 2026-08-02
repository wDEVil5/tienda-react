import { prisma } from '../../lib/prisma.js'

export function crearRepositorioEtiquetasAdmin(cliente = prisma) {
  return {
    listar() {
      return cliente.etiqueta.findMany({
        select: {
          id: true,
          nombre: true,
          slug: true,
          _count: { select: { productos: true } },
        },
        orderBy: { nombre: 'asc' },
      })
    },

    crear(datos) {
      return cliente.etiqueta.create({
        data: datos,
        select: { id: true, nombre: true, slug: true },
      })
    },
  }
}

export const repositorioEtiquetasAdmin = crearRepositorioEtiquetasAdmin()
