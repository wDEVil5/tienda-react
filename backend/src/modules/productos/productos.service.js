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

function normalizarAtributos(atributos) {
  return atributos
    .map(({ atributo, opcion }) => ({
      atributo: normalizarTextoBusqueda(atributo),
      opcion: normalizarTextoBusqueda(opcion),
    }))
    .filter(({ atributo, opcion }) => atributo && opcion)
}

function crearProductoPublico(producto) {
  const productoPublico = { ...producto }

  delete productoPublico.estado

  return {
    ...productoPublico,
    categoria: { ...producto.categoria },
    subcategoria: producto.subcategoria ? { ...producto.subcategoria } : null,
    subcategoriaHija: producto.subcategoriaHija ? { ...producto.subcategoriaHija } : null,
    marca: producto.marca ? { ...producto.marca } : null,
    etiquetas: (producto.etiquetas ?? []).map((etiqueta) => ({ ...etiqueta })),
    atributos: (producto.atributos ?? []).map(({ atributo, opcion }) => ({
      atributo: { ...atributo },
      opcion: { ...opcion },
    })),
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
      subcategoriaHija = '',
      marca = [],
      atributos = [],
      soloOfertas = false,
      soloDisponibles = false,
      precioMin = 0,
      precioMax = Infinity,
      page = PAGINACION_PREDETERMINADA.page,
      limit = PAGINACION_PREDETERMINADA.limit,
      orden = ORDEN_PREDETERMINADO,
    } = {}) {
      const textoBusqueda = normalizarTextoBusqueda(query)
      const categoriaFiltrada = normalizarTextoBusqueda(categoria)
      const subcategoriaFiltrada = normalizarTextoBusqueda(subcategoria)
      const subcategoriaHijaFiltrada = normalizarTextoBusqueda(subcategoriaHija)
      const atributosFiltrados = normalizarAtributos(atributos)
      // Una sola hora por petición evita que la lista y el total discrepen al
      // cruzar el límite temporal de una promoción.
      const ahora = new Date()
      const filtros = {
        ahora,
        ...(textoBusqueda ? { query: textoBusqueda } : {}),
        ...(categoriaFiltrada ? { categoria: categoriaFiltrada } : {}),
        ...(subcategoriaFiltrada ? { subcategoria: subcategoriaFiltrada } : {}),
        ...(subcategoriaHijaFiltrada ? { subcategoriaHija: subcategoriaHijaFiltrada } : {}),
        ...(marca.length ? { marca } : {}),
        ...(atributosFiltrados.length ? { atributos: atributosFiltrados } : {}),
        ...(soloOfertas ? { soloOfertas: true } : {}),
        ...(soloDisponibles ? { soloDisponibles: true } : {}),
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

    // Vitrina "Lo más vendido" del Home: ranking real por unidades vendidas.
    async obtenerMasVendidos({ limit = 12 } = {}) {
      const productos = await repositorio.masVendidosPublicados({ limit })

      return productos.map(crearProductoPublico)
    },

    // "Descubre productos similares" de la ficha. El repositorio resuelve la
    // subcategoría/categoría del producto de `slug`; el servicio hace la copia
    // pública defensiva, igual que "más vendidos".
    async obtenerSimilares(slug, { limit = 8 } = {}) {
      const productos = await repositorio.similaresPublicados({ slug, limit })
      return productos.map(crearProductoPublico)
    },

    // Facetas del sidebar (marcas + rango de precio) para el mismo contexto de la
    // lista, sin considerar marca/precio (para que no se auto-recorten).
    async obtenerFacetas({ query = '', categoria = '', subcategoria = '', subcategoriaHija = '', soloOfertas = false, soloDisponibles = false } = {}) {
      const textoBusqueda = normalizarTextoBusqueda(query)
      const categoriaFiltrada = normalizarTextoBusqueda(categoria)
      const subcategoriaFiltrada = normalizarTextoBusqueda(subcategoria)
      const subcategoriaHijaFiltrada = normalizarTextoBusqueda(subcategoriaHija)
      return repositorio.facetasPublicadas({
        ahora: new Date(),
        ...(textoBusqueda ? { query: textoBusqueda } : {}),
        ...(categoriaFiltrada ? { categoria: categoriaFiltrada } : {}),
        ...(subcategoriaFiltrada ? { subcategoria: subcategoriaFiltrada } : {}),
        ...(subcategoriaHijaFiltrada ? { subcategoriaHija: subcategoriaHijaFiltrada } : {}),
        ...(soloOfertas ? { soloOfertas: true } : {}),
        ...(soloDisponibles ? { soloDisponibles: true } : {}),
      })
    },
  }
}

const servicioProductos = crearServicioProductos()

export const listarProductos = servicioProductos.listarProductos
export const obtenerProductoPorSlug = servicioProductos.obtenerProductoPorSlug
export const obtenerFacetas = servicioProductos.obtenerFacetas
export const obtenerMasVendidos = servicioProductos.obtenerMasVendidos
export const obtenerSimilares = servicioProductos.obtenerSimilares
