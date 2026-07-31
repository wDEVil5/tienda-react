import { productos } from './productos.data.js'

export const PAGINACION_PREDETERMINADA = { page: 1, limit: 12 }
export const LIMITE_MAXIMO_POR_PAGINA = 24
export const ORDEN_PREDETERMINADO = 'relevancia'
export const ORDENES_PERMITIDOS = new Set([
  ORDEN_PREDETERMINADO,
  'precio-asc',
  'precio-desc',
  'nombre-asc',
])

function normalizarTexto(texto) {
  // NFD separa letras y tildes; así "café" y "cafe" se comparan igual.
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

function ordenarProductos(productos, orden) {
  // La relevancia conserva el orden editorial definido por la fuente de datos.
  if (orden === ORDEN_PREDETERMINADO) {
    return productos
  }

  return [...productos].sort((productoA, productoB) => {
    if (orden === 'precio-asc') {
      return productoA.precio - productoB.precio
    }

    if (orden === 'precio-desc') {
      return productoB.precio - productoA.precio
    }

    return productoA.nombre.localeCompare(productoB.nombre, 'es')
  })
}

// La tienda solo expone productos publicados y nunca entrega referencias mutables de la fuente.
export function listarProductos({
  query = '',
  categoria = '',
  soloOfertas = false,
  precioMin = 0,
  precioMax = Infinity,
  page = PAGINACION_PREDETERMINADA.page,
  limit = PAGINACION_PREDETERMINADA.limit,
  orden = ORDEN_PREDETERMINADO,
} = {}) {
  const textoBusqueda = normalizarTexto(query)
  const categoriaFiltrada = normalizarTexto(categoria)

  // Cada filtro vacío se omite, por lo que las condiciones se pueden combinar.
  const productosFiltrados = productos
    .filter((producto) => producto.activo)
    .filter(
      (producto) =>
        !textoBusqueda || normalizarTexto(producto.nombre).includes(textoBusqueda),
    )
    .filter(
      (producto) => !categoriaFiltrada || producto.categoria.slug === categoriaFiltrada,
    )
    // Hasta tener promociones persistidas, precioAnterior representa una oferta vigente.
    .filter((producto) => !soloOfertas || producto.precioAnterior !== null)
    // Los límites se aplican antes de ordenar y paginar: el meta.total siempre
    // representa los productos que realmente cumplen todos los filtros.
    .filter(
      (producto) => producto.precio >= precioMin && producto.precio <= precioMax,
    )
    .map(crearProductoPublico)

  const productosOrdenados = ordenarProductos(productosFiltrados, orden)
  const total = productosOrdenados.length
  const inicio = (page - 1) * limit

  return {
    data: productosOrdenados.slice(inicio, inicio + limit),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export function obtenerProductoPorSlug(slug) {
  // Un producto inactivo se comporta como inexistente para visitantes de la tienda.
  const producto = productos.find(
    (productoActual) => productoActual.activo && productoActual.slug === slug,
  )

  return producto ? crearProductoPublico(producto) : null
}
