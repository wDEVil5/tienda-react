import { prisma } from '../../lib/prisma.js'
import { calcularDisponible, calcularEstadoStock } from '../../lib/estadoStock.js'

// Seleccionamos y traducimos solo el contrato público que ya consume React.
// Así los campos internos de PostgreSQL no se filtran por accidente a la API.
function crearPromocionVigenteDonde(ahora) {
  return {
    activa: true,
    empiezaEn: { lte: ahora },
    terminaEn: { gt: ahora },
  }
}

function crearInclusionProductoPublico(ahora) {
  return {
    categoria: {
      select: { id: true, nombre: true, slug: true },
    },
    subcategoria: {
      select: { id: true, nombre: true, slug: true },
    },
    subcategoriaHija: {
      select: { id: true, nombre: true, slug: true },
    },
    marca: {
      select: { id: true, nombre: true, slug: true, logoUrl: true },
    },
    imagenes: {
      select: { url: true, textoAlternativo: true, orden: true },
      orderBy: { orden: 'asc' },
    },
    etiquetas: {
      select: { etiqueta: { select: { id: true, nombre: true, slug: true } } },
    },
    promociones: {
      where: { promocion: crearPromocionVigenteDonde(ahora) },
      select: {
        promocion: {
          select: {
            id: true,
            slug: true,
            nombre: true,
            porcentajeDescuento: true,
            terminaEn: true,
          },
        },
      },
    },
  }
}

function crearPrecioPorUnidad(producto) {
  const cantidad = Number(producto.contenidoCantidad)
  const unidad = producto.contenidoUnidad?.toLowerCase()

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return null
  }

  const referencia = {
    ml: { factor: 1000, unidad: 'L' },
    l: { factor: 1, unidad: 'L' },
    g: { factor: 1000, unidad: 'kg' },
    kg: { factor: 1, unidad: 'kg' },
  }[unidad]

  if (!referencia) {
    return null
  }

  return {
    monto: Math.round((producto.precio * referencia.factor) / cantidad),
    unidad: referencia.unidad,
  }
}

function crearProductoPublico(producto) {
  // Si una mala carga deja campañas solapadas, se muestra la de mayor beneficio.
  // El panel de administración impedirá ese caso antes de llegar a producción.
  const promocion = (producto.promociones ?? []).reduce((mejorPromocion, enlace) => {
    if (!mejorPromocion || enlace.promocion.porcentajeDescuento > mejorPromocion.porcentajeDescuento) {
      return enlace.promocion
    }

    return mejorPromocion
  }, null)

  return {
    id: producto.id,
    sku: producto.sku,
    slug: producto.slug,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio,
    precioAnterior: producto.precioAnterior,
    oferta: promocion
      ? {
          id: promocion.id,
          slug: promocion.slug,
          nombre: promocion.nombre,
          porcentajeDescuento: promocion.porcentajeDescuento,
          terminaEn: promocion.terminaEn,
        }
      : null,
    stock: producto.stock,
    disponible: calcularDisponible(producto),
    estadoStock: calcularEstadoStock(producto),
    origen: producto.origen,
    contenidoCantidad: producto.contenidoCantidad ? Number(producto.contenidoCantidad) : null,
    contenidoUnidad: producto.contenidoUnidad,
    pesoDespachoGramos: producto.pesoDespachoGramos,
    codigoBarras: producto.codigoBarras,
    precioPorUnidad: crearPrecioPorUnidad(producto),
    fechaVencimiento: producto.fechaVencimiento,
    categoria: producto.categoria,
    subcategoria: producto.subcategoria,
    subcategoriaHija: producto.subcategoriaHija,
    marca: producto.marca,
    etiquetas: producto.etiquetas.map((enlace) => enlace.etiqueta),
    imagenes: producto.imagenes.map((imagen) => ({
      url: imagen.url,
      alt: imagen.textoAlternativo,
      orden: imagen.orden,
    })),
  }
}

function crearFiltrosPublicados({ query, categoria, subcategoria, subcategoriaHija, marca, soloOfertas, soloDisponibles, precioMin, precioMax, ahora } = {}, camposProducto) {
  const where = { estado: 'PUBLICADO' }

  // Solo añadimos condiciones que llegaron desde la capa HTTP. Así Prisma
  // genera una consulta acotada y no cargamos el catálogo completo en Node.
  if (categoria) {
    where.categoria = { slug: categoria }
  }

  if (subcategoria) {
    where.subcategoria = { slug: subcategoria }
  }

  if (subcategoriaHija) {
    where.subcategoriaHija = { slug: subcategoriaHija }
  }

  // Prisma traduce esta comparación de columnas a SQL: stock > stock_reservado.
  // Es la misma regla que calcularDisponible, pero filtrada en la base de datos.
  if (soloDisponibles && camposProducto) {
    where.stock = { gt: camposProducto.stockReservado }
  }

  // Filtro por marca(s): una o varias, por slug (checkboxes del sidebar).
  if (Array.isArray(marca) && marca.length > 0) {
    where.marca = { slug: { in: marca } }
  }

  if (query) {
    // nombreBusqueda ya llega normalizado desde el servicio. El modo
    // insensitive protege los datos antiguos mientras termina la transición.
    where.nombreBusqueda = { contains: query, mode: 'insensitive' }
  }

  if (soloOfertas) {
    where.promociones = {
      some: { promocion: crearPromocionVigenteDonde(ahora) },
    }
  }

  if (precioMin !== undefined || precioMax !== undefined) {
    where.precio = {
      ...(precioMin !== undefined ? { gte: precioMin } : {}),
      ...(precioMax !== undefined ? { lte: precioMax } : {}),
    }
  }

  return where
}

function crearOrdenPersistido(orden) {
  const ordenPrincipal = {
    'precio-asc': { precio: 'asc' },
    'precio-desc': { precio: 'desc' },
    'nombre-asc': { nombre: 'asc' },
    // Mientras no exista un orden editorial persistido, la fecha de alta
    // conserva una relevancia estable para el catálogo.
    relevancia: { createdAt: 'asc' },
  }[orden] ?? { createdAt: 'asc' }

  // El id evita que dos productos con el mismo valor cambien de página entre consultas.
  return [ordenPrincipal, { id: 'asc' }]
}

/**
 * Aísla Prisma del servicio de productos. Recibe el cliente como dependencia
 * para que la lógica de consulta se pueda probar sin abrir PostgreSQL.
 */
export function crearRepositorioProductos(cliente = prisma) {
  return {
    async listarPublicados({ page = 1, limit = 12, orden = 'relevancia', ...filtros } = {}) {
      const ahora = filtros.ahora ?? new Date()
      const where = crearFiltrosPublicados(filtros, cliente.producto.fields)
      const productos = await cliente.producto.findMany({
        where,
        include: crearInclusionProductoPublico(ahora),
        orderBy: crearOrdenPersistido(orden),
        skip: (page - 1) * limit,
        take: limit,
      })

      return productos.map(crearProductoPublico)
    },

    async contarPublicados(filtros = {}) {
      return cliente.producto.count({ where: crearFiltrosPublicados(filtros, cliente.producto.fields) })
    },

    // Facetas del sidebar: marcas presentes en el contexto (categoría/sub/búsqueda/
    // ofertas) con su conteo, y el rango de precio. El contexto NO incluye marca ni
    // precio: así la lista de marcas y el rango no cambian al ir seleccionando.
    async facetasPublicadas(filtros = {}) {
      const where = crearFiltrosPublicados(filtros, cliente.producto.fields)
      const [marcas, precio] = await Promise.all([
        cliente.marca.findMany({
          where: { productos: { some: where } },
          select: {
            id: true,
            nombre: true,
            slug: true,
            _count: { select: { productos: { where } } },
          },
          orderBy: { nombre: 'asc' },
        }),
        cliente.producto.aggregate({ where, _min: { precio: true }, _max: { precio: true } }),
      ])

      return {
        marcas: marcas.map((m) => ({ id: m.id, nombre: m.nombre, slug: m.slug, total: m._count.productos })),
        precio: { min: precio._min.precio ?? 0, max: precio._max.precio ?? 0 },
      }
    },

    async obtenerMaximoDescuentoVigente(ahora = new Date()) {
      const resumen = await cliente.promocion.aggregate({
        where: {
          ...crearPromocionVigenteDonde(ahora),
          productos: { some: { producto: { estado: 'PUBLICADO' } } },
        },
        _max: { porcentajeDescuento: true },
      })

      return resumen._max.porcentajeDescuento
    },

    async obtenerPublicadoPorSlug(slug) {
      const ahora = new Date()
      const producto = await cliente.producto.findFirst({
        where: { estado: 'PUBLICADO', slug },
        include: crearInclusionProductoPublico(ahora),
      })

      return producto ? crearProductoPublico(producto) : null
    },
  }
}

export const repositorioProductos = crearRepositorioProductos()
