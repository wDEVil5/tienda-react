import { prisma } from '../../lib/prisma.js'

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
    marca: {
      select: { id: true, nombre: true, slug: true, logoUrl: true },
    },
    imagenes: {
      select: { url: true, textoAlternativo: true, orden: true },
      orderBy: { orden: 'asc' },
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
    categoria: producto.categoria,
    marca: producto.marca,
    imagenes: producto.imagenes.map((imagen) => ({
      url: imagen.url,
      alt: imagen.textoAlternativo,
      orden: imagen.orden,
    })),
  }
}

function crearFiltrosPublicados({ query, categoria, soloOfertas, precioMin, precioMax, ahora } = {}) {
  const where = { activo: true }

  // Solo añadimos condiciones que llegaron desde la capa HTTP. Así Prisma
  // genera una consulta acotada y no cargamos el catálogo completo en Node.
  if (categoria) {
    where.categoria = { slug: categoria }
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
      const where = crearFiltrosPublicados(filtros)
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
      return cliente.producto.count({ where: crearFiltrosPublicados(filtros) })
    },

    async obtenerMaximoDescuentoVigente(ahora = new Date()) {
      const resumen = await cliente.promocion.aggregate({
        where: {
          ...crearPromocionVigenteDonde(ahora),
          productos: { some: { producto: { activo: true } } },
        },
        _max: { porcentajeDescuento: true },
      })

      return resumen._max.porcentajeDescuento
    },

    async obtenerPublicadoPorSlug(slug) {
      const ahora = new Date()
      const producto = await cliente.producto.findFirst({
        where: { activo: true, slug },
        include: crearInclusionProductoPublico(ahora),
      })

      return producto ? crearProductoPublico(producto) : null
    },
  }
}

export const repositorioProductos = crearRepositorioProductos()
