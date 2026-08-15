import { prisma } from '../../lib/prisma.js'

/**
 * Reúne las entidades que el editor relaciona con un producto. No reutiliza
 * consultas públicas: el panel debe poder crear el primer producto de una
 * categoría o marca que todavía no esté visible en la tienda.
 */
export function crearRepositorioReferenciasAdmin(cliente = prisma) {
  return {
    listarCategoriasActivas() {
      return cliente.categoria.findMany({
        where: { activa: true },
        select: { id: true, nombre: true, slug: true },
        orderBy: { nombre: 'asc' },
      })
    },

    // Subcategorías activas (con su categoriaId) para que el editor ofrezca solo
    // las de la categoría elegida.
    listarSubcategoriasActivas() {
      return cliente.subcategoria.findMany({
        where: { activa: true },
        select: { id: true, nombre: true, slug: true, categoriaId: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      })
    },

    listarMarcas() {
      return cliente.marca.findMany({
        select: { id: true, nombre: true, slug: true, logoUrl: true },
        orderBy: { nombre: 'asc' },
      })
    },

    listarEtiquetas() {
      return cliente.etiqueta.findMany({
        select: { id: true, nombre: true, slug: true },
        orderBy: { nombre: 'asc' },
      })
    },
  }
}

export const repositorioReferenciasAdmin = crearRepositorioReferenciasAdmin()
