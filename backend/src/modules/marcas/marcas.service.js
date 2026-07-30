import { productos } from '../productos/productos.data.js'

// Temporalmente se derivan de productos publicados; luego tendrán logo y orden persistidos.
export function listarMarcas() {
  const marcasPorId = new Map()

  for (const producto of productos) {
    if (!producto.activo) {
      continue
    }

    const marcaExistente = marcasPorId.get(producto.marca.id)

    if (marcaExistente) {
      marcaExistente.productCount += 1
      continue
    }

    marcasPorId.set(producto.marca.id, {
      ...producto.marca,
      logoUrl: null,
      productCount: 1,
    })
  }

  return [...marcasPorId.values()].sort((marcaA, marcaB) =>
    marcaA.nombre.localeCompare(marcaB.nombre, 'es'),
  )
}
