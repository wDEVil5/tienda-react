import { prisma } from '../../lib/prisma.js'

const incluirProductoAdmin = {
  categoria: true,
  subcategoria: { select: { id: true, nombre: true, slug: true } },
  marca: true,
  imagenes: { orderBy: { orden: 'asc' } },
  etiquetas: { include: { etiqueta: true } },
  atributos: {
    include: {
      atributo: { select: { id: true, nombre: true, slug: true, tipo: true } },
      opcion: { select: { id: true, nombre: true, slug: true } },
    },
  },
}

// El listado usa una proyección pequeña: el editor completo se solicita solo
// al abrir un producto, para no cargar galerías y etiquetas innecesarias.
const incluirResumenProductoAdmin = {
  categoria: { select: { id: true, nombre: true, slug: true } },
  marca: { select: { id: true, nombre: true } },
  imagenes: {
    select: { url: true, textoAlternativo: true },
    orderBy: { orden: 'asc' },
    take: 1,
  },
}

export function crearRepositorioProductosAdmin(cliente = prisma) {
  return {
    listar({ page, limit, query, estado }) {
      const where = crearFiltrosListado({ query, estado })

      return cliente.producto.findMany({
        where,
        include: incluirResumenProductoAdmin,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      })
    },

    contar({ query, estado }) {
      return cliente.producto.count({ where: crearFiltrosListado({ query, estado }) })
    },

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

    crear(datos) {
      return cliente.producto.create({ data: datos, include: incluirProductoAdmin })
    },

    // Cuántas líneas de pedido referencian a este producto: si es > 0 tiene
    // ventas y no se puede eliminar en firme (solo archivar).
    contarVentas(id) {
      return cliente.itemPedido.count({ where: { productoId: id } })
    },

    // Borrado definitivo. Imágenes/etiquetas/promos caen en cascada; los ítems de
    // pedido conservan su snapshot y su productoId queda en null (SetNull).
    eliminarPorId(id) {
      return cliente.producto.delete({ where: { id } })
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

    // Devuelve { id, categoriaId } o null: sirve para validar que la subcategoría
    // existe y pertenece a la categoría del producto.
    obtenerSubcategoria(id) {
      return cliente.subcategoria.findUnique({
        where: { id },
        select: { id: true, categoriaId: true },
      })
    },

    contarEtiquetas(ids) {
      return cliente.etiqueta.count({ where: { id: { in: ids } } })
    },

    // Una sola consulta comprueba atributo + opción + categoría. El servicio
    // compara su conteo con el payload para rechazar combinaciones cruzadas.
    contarAtributosValidos(categoriaId, atributos) {
      return cliente.opcionAtributo.count({
        where: {
          atributo: {
            categoriaId,
            activo: true,
          },
          activa: true,
          OR: atributos.map(({ atributoId, opcionId }) => ({ id: opcionId, atributoId })),
        },
      })
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
            storageKey: imagen.storageKey ?? null,
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

function crearFiltrosListado({ query, estado }) {
  return {
    ...(estado ? { estado } : {}),
    ...(query
      ? {
          OR: [
            { nombreBusqueda: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

export const repositorioProductosAdmin = crearRepositorioProductosAdmin()
