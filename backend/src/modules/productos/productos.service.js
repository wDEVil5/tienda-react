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

  delete productoPublico.estado

  return {
    ...productoPublico,
    categoria: { ...producto.categoria },
    subcategoria: producto.subcategoria ? { ...producto.subcategoria } : null,
    marca: { ...producto.marca },
    etiquetas: (producto.etiquetas ?? []).map((etiqueta) => ({ ...etiqueta })),
    oferta: producto.oferta ? { ...producto.oferta } : null,
    imagenes: producto.imagenes.map((imagen) => ({ ...imagen })),
  }
}

/**
 * Conserva las reglas del catálogo independientes de Prisma. El repositorio
 * entrega los productos que coinciden en base de datos; el servicio forma la
 * respuesta pública y sus metadatos de paginación.
 */
export function crearServicioProductos(repositorio = repositorioProductos) {
  return {
    async listarProductos({
      query = '',
      categoria = '',
      subcategoria = '',
      soloOfertas = false,
      precioMin = 0,
      precioMax = Infinity,
      page = PAGINACION_PREDETERMINADA.page,
      limit = PAGINACION_PREDETERMINADA.limit,
      orden = ORDEN_PREDETERMINADO,
    } = {}) {
      const textoBusqueda = normalizarTextoBusqueda(query)
      const categoriaFiltrada = normalizarTextoBusqueda(categoria)
      const subcategoriaFiltrada = normalizarTextoBusqueda(subcategoria)
      // Una sola hora por petición evita que la lista y el total discrepen al
      // cruzar el límite temporal de una promoción.
      const ahora = new Date()
      const filtros = {
        ahora,
        ...(textoBusqueda ? { query: textoBusqueda } : {}),
        ...(categoriaFiltrada ? { categoria: categoriaFiltrada } : {}),
        ...(subcategoriaFiltrada ? { subcategoria: subcategoriaFiltrada } : {}),
        ...(soloOfertas ? { soloOfertas: true } : {}),
        ...(precioMin !== 0 ? { precioMin } : {}),
        ...(Number.isFinite(precioMax) ? { precioMax } : {}),
      }
      const [productos, total, maxDescuento] = await Promise.all([
        repositorio.listarPublicados({ ...filtros, page, limit, orden }),
        repositorio.contarPublicados(filtros),
        soloOfertas
          ? repositorio.obtenerMaximoDescuentoVigente(ahora)
          : Promise.resolve(null),
      ])

      const productosPublicos = productos.map(crearProductoPublico)

      return {
        data: productosPublicos,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          ...(soloOfertas ? { maxDescuento } : {}),
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
