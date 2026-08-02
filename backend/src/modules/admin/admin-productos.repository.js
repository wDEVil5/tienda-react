import { prisma } from '../../lib/prisma.js'

const incluirProductoAdmin = {
  categoria: true,
  marca: true,
  imagenes: { orderBy: { orden: 'asc' } },
  etiquetas: { include: { etiqueta: true } },
}

export function crearRepositorioProductosAdmin(cliente = prisma) {
  return {
    obtenerPorId(id) {
      return cliente.producto.findUnique({
        where: { id },
        include: incluirProductoAdmin,
      })
    },

    actualizarPorId(id, datos) {
      return cliente.producto.update({
        where: { id },
        data: datos,
        include: incluirProductoAdmin,
      })
    },

    async existeCategoriaActiva(id) {
      const categoria = await cliente.categoria.findFirst({
        where: { id, activa: true },
        select: { id: true },
      })
      return Boolean(categoria)
    },

    async existeMarca(id) {
      const marca = await cliente.marca.findUnique({ where: { id }, select: { id: true } })
      return Boolean(marca)
    },

    contarEtiquetas(ids) {
      return cliente.etiqueta.count({ where: { id: { in: ids } } })
    },
  }
}

export const repositorioProductosAdmin = crearRepositorioProductosAdmin()
