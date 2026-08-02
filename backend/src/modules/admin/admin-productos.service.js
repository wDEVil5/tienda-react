import { repositorioProductosAdmin } from './admin-productos.repository.js'
import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { almacenamientoImagenes } from '../imagenes/imagenes.storage.js'

export class ErrorProductoAdmin extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function crearSlug(nombre) {
  const slug = normalizarTextoBusqueda(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!slug) {
    throw new ErrorProductoAdmin(
      'INVALID_PRODUCT_SLUG',
      'El nombre debe incluir letras o números para generar su URL.',
    )
  }

  return slug
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

async function validarReferencias(repositorio, cambios) {
  const categoriaInvalida =
    cambios.categoriaId !== undefined &&
    !(await repositorio.existeCategoriaActiva(cambios.categoriaId))
  const marcaInvalida =
    cambios.marcaId !== undefined && !(await repositorio.existeMarca(cambios.marcaId))
  const etiquetasInvalidas =
    cambios.etiquetaIds !== undefined &&
    (await repositorio.contarEtiquetas(cambios.etiquetaIds)) !== cambios.etiquetaIds.length

  if (categoriaInvalida || marcaInvalida || etiquetasInvalidas) {
    throw new ErrorProductoAdmin(
      'INVALID_PRODUCT_REFERENCE',
      'Categoría, marca o etiquetas no son válidas.',
    )
  }
}

export function crearServicioProductosAdmin(
  repositorio = repositorioProductosAdmin,
  almacenamiento = almacenamientoImagenes,
) {
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

      if (cambios.activo === true && productoActual.imagenes.length === 0) {
        throw new ErrorProductoAdmin(
          'PRODUCT_IMAGE_REQUIRED',
          'Debes asignar al menos una imagen antes de publicar el producto.',
        )
      }

      await validarReferencias(repositorio, cambios)

      const productoActualizado = await repositorio.actualizarPorId(
        id,
        construirDatosActualizacion(cambios),
      )
      return crearProductoParaEdicion(productoActualizado)
    },

    async crearProducto(datos) {
      await validarReferencias(repositorio, datos)
      const slug = datos.slug ?? crearSlug(datos.nombre)
      const producto = await repositorio.crear({
        ...construirDatosActualizacion({ ...datos, slug }),
        // La galería se administra en un flujo separado: un producto nuevo se
        // mantiene fuera del catálogo hasta que tenga al menos una imagen.
        activo: false,
      })

      return crearProductoParaEdicion(producto)
    },

    async desactivarProducto(id) {
      const producto = await repositorio.obtenerPorId(id)
      if (!producto) return false

      // La baja lógica permite recuperar el producto y preserva referencias
      // futuras de pedidos; un producto inactivo tampoco puede destacarse.
      await repositorio.actualizarPorId(id, { activo: false, destacado: false })
      return true
    },

    async reemplazarImagenesProducto(id, imagenes) {
      const productoActual = await repositorio.obtenerPorId(id)
      if (!productoActual) return null

      const clavesNuevas = new Set(
        imagenes.map((imagen) => imagen.storageKey).filter(Boolean),
      )
      const clavesEliminadas = productoActual.imagenes
        .map((imagen) => imagen.storageKey)
        .filter((storageKey) => storageKey && !clavesNuevas.has(storageKey))

      const producto = await repositorio.reemplazarImagenesPorProducto(id, imagenes)

      // Primero persiste la nueva galería: si Cloudinary falla al limpiar un
      // archivo ya no referenciado, el catálogo sigue consistente y se puede
      // reintentar la limpieza sin restaurar una galería antigua.
      const eliminaciones = await Promise.allSettled(
        clavesEliminadas.map((storageKey) => almacenamiento.eliminarImagenProducto(storageKey)),
      )
      eliminaciones.forEach((resultado, indice) => {
        if (resultado.status === 'rejected') {
          console.error(`No se pudo eliminar la imagen ${clavesEliminadas[indice]} de Cloudinary.`)
        }
      })

      return crearProductoParaEdicion(producto)
    },
  }
}

const servicioProductosAdmin = crearServicioProductosAdmin()

export const obtenerProductoParaEdicion = servicioProductosAdmin.obtenerProductoParaEdicion
export const actualizarProducto = servicioProductosAdmin.actualizarProducto
export const crearProducto = servicioProductosAdmin.crearProducto
export const desactivarProducto = servicioProductosAdmin.desactivarProducto
export const reemplazarImagenesProducto = servicioProductosAdmin.reemplazarImagenesProducto
