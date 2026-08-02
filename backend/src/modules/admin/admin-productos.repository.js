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

    async reemplazarImagenesPorProducto(id, imagenes) {
      return cliente.$transaction(async (transaccion) => {
        const producto = await transaccion.producto.findUnique({
          where: { id },
          select: { id: true },
        })
        if (!producto) return null

        await transaccion.productoImagen.deleteMany({ where: { productoId: id } })
        await transaccion.productoImagen.createMany({
          data: imagenes.map((imagen, indice) => ({
            productoId: id,
            url: imagen.url,
            textoAlternativo: imagen.textoAlternativo ?? null,
            orden: indice + 1,
          })),
        })

        return transaccion.producto.findUnique({
          where: { id },
          include: incluirProductoAdmin,
        })
      })
    },
  }
}

export const repositorioProductosAdmin = crearRepositorioProductosAdmin()
