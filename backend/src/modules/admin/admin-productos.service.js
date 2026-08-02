import { repositorioProductosAdmin } from './admin-productos.repository.js'

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

export function crearServicioProductosAdmin(repositorio = repositorioProductosAdmin) {
  return {
    async obtenerProductoParaEdicion(id) {
      const producto = await repositorio.obtenerPorId(id)
      return producto ? crearProductoParaEdicion(producto) : null
    },
  }
}

const servicioProductosAdmin = crearServicioProductosAdmin()

export const obtenerProductoParaEdicion = servicioProductosAdmin.obtenerProductoParaEdicion
