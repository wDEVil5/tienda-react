import { productos } from './productos.data.js'

function crearProductoPublico(producto) {
  const productoPublico = { ...producto }

  delete productoPublico.activo

  return {
    ...productoPublico,
    categoria: { ...producto.categoria },
    marca: { ...producto.marca },
    imagenes: producto.imagenes.map((imagen) => ({ ...imagen })),
  }
}

// La tienda solo expone productos publicados y nunca entrega referencias mutables de la fuente.
export function listarProductos() {
  return productos
    .filter((producto) => producto.activo)
    .map(crearProductoPublico)
}

export function obtenerProductoPorSlug(slug) {
  const producto = productos.find(
    (productoActual) => productoActual.activo && productoActual.slug === slug,
  )

  return producto ? crearProductoPublico(producto) : null
}
