import { repositorioProductosAdmin } from './admin-productos.repository.js'
import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { almacenamientoImagenes } from '../imagenes/imagenes.storage.js'
import { repositorioAvisos } from '../avisos/avisos.repository.js'
import { procesadorAvisos } from '../avisos/avisos.notificaciones.js'
import { calcularDisponible } from '../../lib/estadoStock.js'

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
    estado: producto.estado,
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
    // Puede no tener subcategoría; el editor la preselecciona con subcategoriaId.
    subcategoriaId: producto.subcategoriaId ?? null,
    subcategoria: producto.subcategoria
      ? { id: producto.subcategoria.id, nombre: producto.subcategoria.nombre, slug: producto.subcategoria.slug }
      : null,
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

function crearResumenProductoAdmin(producto) {
  return {
    id: producto.id,
    sku: producto.sku,
    slug: producto.slug,
    nombre: producto.nombre,
    precio: producto.precio,
    stock: producto.stock,
    estado: producto.estado,
    destacado: producto.destacado,
    categoria: producto.categoria,
    marca: producto.marca,
    imagen: producto.imagenes[0]
      ? { url: producto.imagenes[0].url, alt: producto.imagenes[0].textoAlternativo }
      : null,
  }
}

function construirDatosActualizacion(cambios) {
  const { categoriaId, subcategoriaId, marcaId, etiquetaIds, fechaVencimiento, ...campos } = cambios
  const datos = { ...campos }

  if (cambios.nombre !== undefined) {
    datos.nombreBusqueda = normalizarTextoBusqueda(cambios.nombre)
  }

  if (categoriaId !== undefined) {
    datos.categoria = { connect: { id: categoriaId } }
  }

  // Subcategoría opcional: null la desasocia (SetNull), un id la conecta.
  if (subcategoriaId !== undefined) {
    datos.subcategoria = subcategoriaId === null
      ? { disconnect: true }
      : { connect: { id: subcategoriaId } }
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

async function validarReferencias(repositorio, cambios, categoriaIdEfectiva) {
  const categoriaInvalida =
    cambios.categoriaId !== undefined &&
    !(await repositorio.existeCategoriaActiva(cambios.categoriaId))
  const marcaInvalida =
    cambios.marcaId !== undefined && !(await repositorio.existeMarca(cambios.marcaId))
  const etiquetasInvalidas =
    cambios.etiquetaIds !== undefined &&
    (await repositorio.contarEtiquetas(cambios.etiquetaIds)) !== cambios.etiquetaIds.length

  // Subcategoría: null la limpia (siempre válido). Si viene un id, debe existir y
  // pertenecer a la categoría efectiva del producto (no a otra).
  let subcategoriaInvalida = false
  if (cambios.subcategoriaId != null) {
    const subcategoria = await repositorio.obtenerSubcategoria(cambios.subcategoriaId)
    subcategoriaInvalida =
      !subcategoria ||
      (categoriaIdEfectiva !== undefined && subcategoria.categoriaId !== categoriaIdEfectiva)
  }

  if (categoriaInvalida || marcaInvalida || etiquetasInvalidas || subcategoriaInvalida) {
    throw new ErrorProductoAdmin(
      'INVALID_PRODUCT_REFERENCE',
      'Categoría, subcategoría, marca o etiquetas no son válidas.',
    )
  }
}

export function crearServicioProductosAdmin(
  repositorio = repositorioProductosAdmin,
  almacenamiento = almacenamientoImagenes,
  avisos = repositorioAvisos,
  procesador = procesadorAvisos,
) {
  return {
    async listarProductos({ page = 1, limit = 20, query = '', estado } = {}) {
      const textoBusqueda = normalizarTextoBusqueda(query)
      const filtros = {
        page,
        limit,
        ...(textoBusqueda ? { query: textoBusqueda } : {}),
        ...(estado ? { estado } : {}),
      }
      const [productos, total] = await Promise.all([
        repositorio.listar(filtros),
        repositorio.contar(filtros),
      ])

      return {
        data: productos.map(crearResumenProductoAdmin),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

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

      if (cambios.estado === 'PUBLICADO' && productoActual.imagenes.length === 0) {
        throw new ErrorProductoAdmin(
          'PRODUCT_IMAGE_REQUIRED',
          'Debes asignar al menos una imagen antes de publicar el producto.',
        )
      }

      await validarReferencias(
        repositorio,
        cambios,
        cambios.categoriaId ?? productoActual.categoriaId,
      )

      const productoActualizado = await repositorio.actualizarPorId(
        id,
        construirDatosActualizacion(cambios),
      )

      // Reposición: si el producto pasó de agotado a disponible, los avisos
      // pendientes quedan listos y se dispara el envío.
      const disponibleAntes = calcularDisponible(productoActual)
      const disponibleDespues = calcularDisponible(productoActualizado)
      if (disponibleAntes <= 0 && disponibleDespues > 0) {
        await avisos.marcarListosPorProducto(id)
        // Envío automático, acotado a este producto y SIN bloquear la respuesta
        // del admin. Si falla, el aviso queda listo para el próximo barrido.
        procesador
          .procesarReposiciones({ productoId: id })
          .catch((error) => console.error(`Barrido de avisos falló para ${id}: ${error.message}`))
      }

      return crearProductoParaEdicion(productoActualizado)
    },

    async crearProducto(datos) {
      await validarReferencias(repositorio, datos, datos.categoriaId)
      const slug = datos.slug ?? crearSlug(datos.nombre)
      const producto = await repositorio.crear({
        ...construirDatosActualizacion({ ...datos, slug }),
        // La galería se administra en un flujo separado: un producto nuevo se
        // mantiene fuera del catálogo hasta que tenga al menos una imagen.
        estado: 'BORRADOR',
      })

      return crearProductoParaEdicion(producto)
    },

    async desactivarProducto(id) {
      const producto = await repositorio.obtenerPorId(id)
      if (!producto) return false

      // La baja lógica permite recuperar el producto y preserva referencias
      // futuras de pedidos; un producto archivado tampoco puede destacarse.
      await repositorio.actualizarPorId(id, { estado: 'ARCHIVADO', destacado: false })
      return true
    },

    // Reactiva un producto archivado: vuelve a BORRADOR (no directo a publicado,
    // para que el operador lo revise y publique con su galería vigente).
    async restaurarProducto(id) {
      const producto = await repositorio.obtenerPorId(id)
      if (!producto) return null

      const actualizado = await repositorio.actualizarPorId(id, { estado: 'BORRADOR' })
      return crearProductoParaEdicion(actualizado)
    },

    // Borrado DEFINITIVO. Solo si el producto no tiene ventas (ninguna línea de
    // pedido lo referencia): con ventas se archiva, no se elimina, para no perder
    // la trazabilidad. Tras borrar la fila, limpia sus imágenes en Cloudinary.
    async eliminarProducto(id) {
      const producto = await repositorio.obtenerPorId(id)
      if (!producto) return false

      const ventas = await repositorio.contarVentas(id)
      if (ventas > 0) {
        throw new ErrorProductoAdmin(
          'PRODUCT_HAS_SALES',
          'Este producto tiene pedidos asociados: archívalo en lugar de eliminarlo.',
        )
      }

      const claves = producto.imagenes.map((imagen) => imagen.storageKey).filter(Boolean)
      await repositorio.eliminarPorId(id)

      const limpieza = await Promise.allSettled(
        claves.map((storageKey) => almacenamiento.eliminarImagenProducto(storageKey)),
      )
      limpieza.forEach((resultado, indice) => {
        if (resultado.status === 'rejected') {
          console.error(`No se pudo eliminar la imagen ${claves[indice]} de Cloudinary.`)
        }
      })

      return true
    },

    async reemplazarImagenesProducto(id, imagenes) {
      const productoActual = await repositorio.obtenerPorId(id)
      if (!productoActual) return null

      // Un borrador puede vaciar su galería, pero un producto público siempre
      // necesita una imagen principal para no romper tarjetas ni detalle.
      if (productoActual.estado === 'PUBLICADO' && imagenes.length === 0) {
        throw new ErrorProductoAdmin(
          'PRODUCT_IMAGE_REQUIRED',
          'Un producto publicado debe conservar al menos una imagen.',
        )
      }

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

export const listarProductosAdmin = servicioProductosAdmin.listarProductos
export const obtenerProductoParaEdicion = servicioProductosAdmin.obtenerProductoParaEdicion
export const actualizarProducto = servicioProductosAdmin.actualizarProducto
export const crearProducto = servicioProductosAdmin.crearProducto
export const desactivarProducto = servicioProductosAdmin.desactivarProducto
export const restaurarProducto = servicioProductosAdmin.restaurarProducto
export const eliminarProducto = servicioProductosAdmin.eliminarProducto
export const reemplazarImagenesProducto = servicioProductosAdmin.reemplazarImagenesProducto
