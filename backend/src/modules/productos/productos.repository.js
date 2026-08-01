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

/**
 * Aísla Prisma del servicio de productos. Recibe el cliente como dependencia
 * para que la lógica de consulta se pueda probar sin abrir PostgreSQL.
 */
export function crearRepositorioProductos(cliente = prisma) {
  return {
    async listarPublicados() {
      const productos = await cliente.producto.findMany({
        where: { activo: true },
        include: incluirProductoPublico,
        // Mientras no exista un orden editorial persistido, la fecha de alta
        // conserva una relevancia estable para el catálogo.
        orderBy: { createdAt: 'asc' },
      })

      return productos.map(crearProductoPublico)
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
