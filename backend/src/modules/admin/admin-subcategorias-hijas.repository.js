import { prisma } from '../../lib/prisma.js'

export function crearRepositorioSubcategoriasHijasAdmin(cliente = prisma) {
  return {
    obtenerSubcategoria(id) {
      return cliente.subcategoria.findUnique({
        where: { id },
        select: { id: true, slug: true },
      })
    },
    obtenerPorId(id) {
      return cliente.subcategoriaHija.findUnique({
        where: { id },
        select: {
          id: true, nombre: true, slug: true, orden: true, activa: true, subcategoriaId: true,
          _count: { select: { productos: true } },
        },
      })
    },
    crear(datos) {
      return cliente.subcategoriaHija.create({
        data: datos,
        select: { id: true, nombre: true, slug: true, orden: true, activa: true },
      })
    },
    actualizarPorId(id, datos) {
      return cliente.subcategoriaHija.update({
        where: { id }, data: datos,
        select: { id: true, nombre: true, slug: true, orden: true, activa: true },
      })
    },
    eliminar(id) {
      return cliente.subcategoriaHija.delete({ where: { id } })
    },
  }
}

export const repositorioSubcategoriasHijasAdmin = crearRepositorioSubcategoriasHijasAdmin()
