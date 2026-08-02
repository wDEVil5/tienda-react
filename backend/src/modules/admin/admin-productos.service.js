import { repositorioProductosAdmin } from './admin-productos.repository.js'
import { normalizarTextoBusqueda } from '../../lib/texto.js'

export class ErrorProductoAdmin extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function crearProductoParaEdicion(producto) {
  return {
    id: producto.id,
    sku: producto.sku,
    slug: producto.slug,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio,
    precioAnterior: producto.precioAnterior,
    stock: producto.stock,
    activo: producto.activo,
    destacado: producto.destacado,
    alertaStockBajo: producto.alertaStockBajo,
    codigoBarras: producto.codigoBarras,
    origen: producto.origen,
    contenidoCantidad: producto.contenidoCantidad
      ? Number(producto.contenidoCantidad)
      : null,
    contenidoUnidad: producto.contenidoUnidad,
    pesoDespachoGramos: producto.pesoDespachoGramos,
    fechaVencimiento: producto.fechaVencimiento,
    categoria: {
      id: producto.categoria.id,
      nombre: producto.categoria.nombre,
      slug: producto.categoria.slug,
    },
    marca: {
      id: producto.marca.id,
      nombre: producto.marca.nombre,
      slug: producto.marca.slug,
      logoUrl: producto.marca.logoUrl,
    },
    imagenes: producto.imagenes.map((imagen) => ({
      id: imagen.id,
      url: imagen.url,
      storageKey: imagen.storageKey,
      textoAlternativo: imagen.textoAlternativo,
      orden: imagen.orden,
    })),
    etiquetas: producto.etiquetas.map(({ etiqueta }) => ({
      id: etiqueta.id,
      nombre: etiqueta.nombre,
      slug: etiqueta.slug,
    })),
  }
}

function construirDatosActualizacion(cambios) {
  const { categoriaId, marcaId, etiquetaIds, fechaVencimiento, ...campos } = cambios
  const datos = { ...campos }

  if (cambios.nombre !== undefined) {
    datos.nombreBusqueda = normalizarTextoBusqueda(cambios.nombre)
  }

  if (categoriaId !== undefined) {
    datos.categoria = { connect: { id: categoriaId } }
  }

  if (marcaId !== undefined) {
    datos.marca = { connect: { id: marcaId } }
  }

  if (etiquetaIds !== undefined) {
    datos.etiquetas = {
      deleteMany: {},
      create: etiquetaIds.map((etiquetaId) => ({
        etiqueta: { connect: { id: etiquetaId } },
      })),
    }
  }

  if (fechaVencimiento !== undefined) {
    datos.fechaVencimiento = fechaVencimiento
      ? new Date(`${fechaVencimiento}T12:00:00`)
      : null
  }

  return datos
}

export function crearServicioProductosAdmin(repositorio = repositorioProductosAdmin) {
  return {
    async obtenerProductoParaEdicion(id) {
      const producto = await repositorio.obtenerPorId(id)
      return producto ? crearProductoParaEdicion(producto) : null
    },

    async actualizarProducto(id, cambios) {
      const productoActual = await repositorio.obtenerPorId(id)

      if (!productoActual) {
        return null
      }

      const precio = cambios.precio ?? productoActual.precio
      const precioAnterior = cambios.precioAnterior === undefined
        ? productoActual.precioAnterior
        : cambios.precioAnterior
      if (precioAnterior !== null && precioAnterior <= precio) {
        throw new ErrorProductoAdmin(
          'INVALID_PRODUCT_PRICE',
          'precioAnterior debe ser mayor que precio.',
        )
      }

      if (
        (cambios.categoriaId !== undefined &&
          !(await repositorio.existeCategoriaActiva(cambios.categoriaId))) ||
        (cambios.marcaId !== undefined && !(await repositorio.existeMarca(cambios.marcaId))) ||
        (cambios.etiquetaIds !== undefined &&
          (await repositorio.contarEtiquetas(cambios.etiquetaIds)) !== cambios.etiquetaIds.length)
      ) {
        throw new ErrorProductoAdmin(
          'INVALID_PRODUCT_REFERENCE',
          'Categoría, marca o etiquetas no son válidas.',
        )
      }

      const productoActualizado = await repositorio.actualizarPorId(
        id,
        construirDatosActualizacion(cambios),
      )
      return crearProductoParaEdicion(productoActualizado)
    },

    async reemplazarImagenesProducto(id, imagenes) {
      const producto = await repositorio.reemplazarImagenesPorProducto(id, imagenes)
      return producto ? crearProductoParaEdicion(producto) : null
    },
  }
}

const servicioProductosAdmin = crearServicioProductosAdmin()

export const obtenerProductoParaEdicion = servicioProductosAdmin.obtenerProductoParaEdicion
export const actualizarProducto = servicioProductosAdmin.actualizarProducto
export const reemplazarImagenesProducto = servicioProductosAdmin.reemplazarImagenesProducto
