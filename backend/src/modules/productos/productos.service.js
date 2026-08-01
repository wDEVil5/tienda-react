import { repositorioProductos } from './productos.repository.js'
import { normalizarTextoBusqueda } from '../../lib/texto.js'

export const PAGINACION_PREDETERMINADA = { page: 1, limit: 12 }
export const LIMITE_MAXIMO_POR_PAGINA = 24
export const ORDEN_PREDETERMINADO = 'relevancia'
export const ORDENES_PERMITIDOS = new Set([
  ORDEN_PREDETERMINADO,
  'precio-asc',
  'precio-desc',
  'nombre-asc',
])

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

/**
 * Conserva las reglas del catálogo independientes de Prisma. El repositorio
 * entrega los productos que coinciden en base de datos; el servicio forma la
 * respuesta pública y conserva reglas no persistibles como la paginación.
 */
export function crearServicioProductos(repositorio = repositorioProductos) {
  return {
    async listarProductos({
      query = '',
      categoria = '',
      soloOfertas = false,
      precioMin = 0,
      precioMax = Infinity,
      page = PAGINACION_PREDETERMINADA.page,
      limit = PAGINACION_PREDETERMINADA.limit,
      orden = ORDEN_PREDETERMINADO,
    } = {}) {
      const textoBusqueda = normalizarTextoBusqueda(query)
      const categoriaFiltrada = normalizarTextoBusqueda(categoria)
      const productos = await repositorio.listarPublicados({
        ...(textoBusqueda ? { query: textoBusqueda } : {}),
        ...(categoriaFiltrada ? { categoria: categoriaFiltrada } : {}),
        ...(soloOfertas ? { soloOfertas: true } : {}),
        ...(precioMin !== 0 ? { precioMin } : {}),
        ...(Number.isFinite(precioMax) ? { precioMax } : {}),
      })

      const productosPublicos = productos.map(crearProductoPublico)

      const productosOrdenados = ordenarProductos(productosPublicos, orden)
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
    },

    async obtenerProductoPorSlug(slug) {
      // El repositorio ya restringe la búsqueda a productos publicados.
      const producto = await repositorio.obtenerPublicadoPorSlug(slug)

      return producto ? crearProductoPublico(producto) : null
    },
  }
}

const servicioProductos = crearServicioProductos()

export const listarProductos = servicioProductos.listarProductos
export const obtenerProductoPorSlug = servicioProductos.obtenerProductoPorSlug
