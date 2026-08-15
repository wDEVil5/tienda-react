import { prisma } from '../../lib/prisma.js'

export function crearRepositorioSubcategoriasAdmin(cliente = prisma) {
  return {
    // Todas las subcategorías de una categoría (incluye inactivas), ordenadas.
    listarPorCategoria(categoriaId) {
      return cliente.subcategoria.findMany({
        where: { categoriaId },
        select: {
          id: true,
          nombre: true,
          slug: true,
          orden: true,
          activa: true,
          _count: { select: { productos: true } },
        },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      })
    },

    obtenerPorId(id) {
      return cliente.subcategoria.findUnique({
        where: { id },
        select: {
          id: true,
          categoriaId: true,
          nombre: true,
          slug: true,
          orden: true,
          activa: true,
          _count: { select: { productos: true } },
        },
      })
    },

    // La categoría padre: se usa para prefijar el slug y validar que existe.
    obtenerCategoria(categoriaId) {
      return cliente.categoria.findUnique({
        where: { id: categoriaId },
        select: { id: true, slug: true },
      })
    },

    crear(datos) {
      return cliente.subcategoria.create({
        data: datos,
        select: { id: true, nombre: true, slug: true, orden: true, activa: true },
      })
    },

    actualizarPorId(id, datos) {
      return cliente.subcategoria.update({
        where: { id },
        data: datos,
        select: { id: true, nombre: true, slug: true, orden: true, activa: true },
      })
    },

    eliminar(id) {
      return cliente.subcategoria.delete({ where: { id } })
    },
  }
}

export const repositorioSubcategoriasAdmin = crearRepositorioSubcategoriasAdmin()
