import { prisma } from '../../lib/prisma.js'

// Seleccionamos y traducimos solo el contrato público que ya consume React.
// Así los campos internos de PostgreSQL no se filtran por accidente a la API.
const incluirProductoPublico = {
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
}

function crearProductoPublico(producto) {
  return {
    id: producto.id,
    sku: producto.sku,
    slug: producto.slug,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio,
    precioAnterior: producto.precioAnterior,
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

function crearFiltrosPublicados({ query, categoria, soloOfertas, precioMin, precioMax } = {}) {
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
    // Por ahora una oferta vigente se representa con un precio anterior.
    // La futura entidad Promoción reemplazará esta condición sin afectar rutas.
    where.precioAnterior = { not: null }
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
      const where = crearFiltrosPublicados(filtros)
      const productos = await cliente.producto.findMany({
        where,
        include: incluirProductoPublico,
        orderBy: crearOrdenPersistido(orden),
        skip: (page - 1) * limit,
        take: limit,
      })

      return productos.map(crearProductoPublico)
    },

    async contarPublicados(filtros = {}) {
      return cliente.producto.count({ where: crearFiltrosPublicados(filtros) })
    },

    async obtenerPublicadoPorSlug(slug) {
      const producto = await cliente.producto.findFirst({
        where: { activo: true, slug },
        include: incluirProductoPublico,
      })

      return producto ? crearProductoPublico(producto) : null
    },
  }
}

export const repositorioProductos = crearRepositorioProductos()
