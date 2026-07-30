import { productos } from './productos.data.js'

function normalizarTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

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
export function listarProductos({ query = '' } = {}) {
  const textoBusqueda = normalizarTexto(query)

  return productos
    .filter((producto) => producto.activo)
    .filter(
      (producto) =>
        !textoBusqueda || normalizarTexto(producto.nombre).includes(textoBusqueda),
    )
    .map(crearProductoPublico)
}

export function obtenerProductoPorSlug(slug) {
  const producto = productos.find(
    (productoActual) => productoActual.activo && productoActual.slug === slug,
  )

  return producto ? crearProductoPublico(producto) : null
}
