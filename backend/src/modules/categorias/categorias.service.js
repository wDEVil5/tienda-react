import { productos } from '../productos/productos.data.js'

// Temporalmente se derivan de productos publicados; PostgreSQL las persistirá como entidad propia.
export function listarCategorias() {
  const categoriasPorSlug = new Map()

  for (const producto of productos) {
    if (!producto.activo) {
      continue
    }

    const categoriaExistente = categoriasPorSlug.get(producto.categoria.slug)

    if (categoriaExistente) {
      categoriaExistente.productCount += 1
      continue
    }

    categoriasPorSlug.set(producto.categoria.slug, {
      ...producto.categoria,
      productCount: 1,
    })
  }

  return [...categoriasPorSlug.values()].sort((categoriaA, categoriaB) =>
    categoriaA.nombre.localeCompare(categoriaB.nombre, 'es'),
  )
}
