import { repositorioPromocionesAdmin } from './admin-promociones.repository.js'

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
    async listarPromociones() {
      const promociones = await repositorio.listar()
      return { data: promociones.map(crearResumenPromocion) }
    },
  }
}

const servicioPromocionesAdmin = crearServicioPromocionesAdmin()

export const listarPromocionesAdmin = servicioPromocionesAdmin.listarPromociones
