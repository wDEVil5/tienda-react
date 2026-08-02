import { repositorioPromocionesAdmin } from './admin-promociones.repository.js'
import { normalizarTextoBusqueda } from '../../lib/texto.js'

export class ErrorPromocionAdmin extends Error {
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
    throw new ErrorPromocionAdmin(
      'INVALID_PROMOTION_SLUG',
      'El nombre debe incluir letras o números para generar su URL.',
    )
  }

  return slug
}

function crearResumenPromocion(promocion) {
  return {
    id: promocion.id,
    nombre: promocion.nombre,
    slug: promocion.slug,
    porcentajeDescuento: promocion.porcentajeDescuento,
    empiezaEn: promocion.empiezaEn,
    terminaEn: promocion.terminaEn,
    activa: promocion.activa,
    productosAsignados: promocion._count.productos,
  }
}

export function crearServicioPromocionesAdmin(repositorio = repositorioPromocionesAdmin) {
  return {
    async desactivarPromocion(id) {
      const promocion = await repositorio.obtenerPorId(id)
      if (!promocion) return null

      const actualizada = await repositorio.actualizarPorId(id, { activa: false })
      return crearResumenPromocion(actualizada)
    },

    async activarPromocion(id) {
      const promocion = await repositorio.obtenerPorId(id)
      if (!promocion) return null

      const productoIds = promocion.productos.map(({ productoId }) => productoId)
      const solapamiento = await repositorio.buscarSolapamientoActivo({
        id: promocion.id,
        empiezaEn: promocion.empiezaEn,
        terminaEn: promocion.terminaEn,
        productoIds,
      })

      if (solapamiento) {
        throw new ErrorPromocionAdmin(
          'PROMOTION_OVERLAP',
          `La campaña coincide con la promoción activa “${solapamiento.nombre}”.`,
        )
      }

      const actualizada = await repositorio.actualizarPorId(id, { activa: true })
      return crearResumenPromocion(actualizada)
    },

    async crearPromocion(datos) {
      const productosEncontrados = await repositorio.contarProductos(datos.productoIds)
      if (productosEncontrados !== datos.productoIds.length) {
        throw new ErrorPromocionAdmin(
          'INVALID_PROMOTION_PRODUCT',
          'Uno o más productos seleccionados no existen.',
        )
      }

      const promocion = await repositorio.crear({
        ...datos,
        slug: datos.slug ?? crearSlug(datos.nombre),
        empiezaEn: new Date(datos.empiezaEn),
        terminaEn: new Date(datos.terminaEn),
        // Se revisa antes de activarla para que una campaña incompleta nunca
        // cambie precios por accidente en la tienda.
        activa: false,
      })

      return crearResumenPromocion(promocion)
    },

    async listarPromociones() {
      const promociones = await repositorio.listar()
      return { data: promociones.map(crearResumenPromocion) }
    },
  }
}

const servicioPromocionesAdmin = crearServicioPromocionesAdmin()

export const listarPromocionesAdmin = servicioPromocionesAdmin.listarPromociones
export const crearPromocionAdmin = servicioPromocionesAdmin.crearPromocion
export const activarPromocionAdmin = servicioPromocionesAdmin.activarPromocion
export const desactivarPromocionAdmin = servicioPromocionesAdmin.desactivarPromocion
