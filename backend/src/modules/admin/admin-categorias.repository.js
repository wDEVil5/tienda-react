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

    obtenerPorId(id) {
      return cliente.categoria.findUnique({
        where: { id },
        select: { id: true, nombre: true, activa: true, _count: { select: { productos: true } } },
      })
    },

    actualizarPorId(id, datos) {
      return cliente.categoria.update({
        where: { id },
        data: datos,
        select: { id: true, nombre: true, slug: true, activa: true },
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
