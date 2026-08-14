import { prisma } from '../../lib/prisma.js'

export function crearRepositorioPaginas(cliente = prisma) {
  return {
    obtenerPorSlug(slug) {
      return cliente.paginaContenido.findUnique({ where: { slug } })
    },

    listar() {
      return cliente.paginaContenido.findMany({
        select: { slug: true, titulo: true, publicada: true, updatedAt: true },
      })
    },

    // Upsert por slug: crea la fila la primera vez que se guarda una página, la
    // actualiza después.
    guardar(slug, { titulo, cuerpo, publicada }) {
      return cliente.paginaContenido.upsert({
        where: { slug },
        create: { slug, titulo, cuerpo, publicada },
        update: { titulo, cuerpo, publicada },
      })
    },
  }
}

export const repositorioPaginas = crearRepositorioPaginas()
