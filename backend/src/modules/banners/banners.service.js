import { eliminarImagenBanner } from '../imagenes/imagenes.storage.js'
import { repositorioBanners } from './banners.repository.js'

// Forma que consume el panel (sin timestamps). El público recibe menos campos
// (los arma directamente el repositorio en listarVigentes).
function proyectarAdmin(banner) {
  return {
    id: banner.id,
    titulo: banner.titulo,
    imagenUrl: banner.imagenUrl,
    storageKey: banner.storageKey,
    enlace: banner.enlace,
    orden: banner.orden,
    activo: banner.activo,
    empiezaEn: banner.empiezaEn,
    terminaEn: banner.terminaEn,
  }
}

export function crearServicioBanners(
  repositorio = repositorioBanners,
  eliminarImagen = eliminarImagenBanner,
) {
  return {
    // Carrusel público: solo los vigentes, ya proyectados por el repositorio.
    listarBannersPublicos() {
      return repositorio.listarVigentes()
    },

    async listarBannersAdmin() {
      const banners = await repositorio.listarTodos()
      return banners.map(proyectarAdmin)
    },

    async obtenerBannerAdmin(id) {
      const banner = await repositorio.obtenerPorId(id)
      return banner ? proyectarAdmin(banner) : null
    },

    async crearBanner(datos) {
      return proyectarAdmin(await repositorio.crear(datos))
    },

    async actualizarBanner(id, datos) {
      const existe = await repositorio.obtenerPorId(id)
      if (!existe) return null
      return proyectarAdmin(await repositorio.actualizar(id, datos))
    },

    // Borra el banner y, si tenía imagen propia en Cloudinary, la elimina también.
    // El borrado de la imagen es best-effort: si falla, el banner ya se fue.
    async eliminarBanner(id) {
      const banner = await repositorio.obtenerPorId(id)
      if (!banner) return false
      await repositorio.eliminar(id)
      if (banner.storageKey) {
        await eliminarImagen(banner.storageKey).catch(() => {})
      }
      return true
    },
  }
}

const servicioBanners = crearServicioBanners()

export const listarBannersPublicos = () => servicioBanners.listarBannersPublicos()
export const listarBannersAdmin = () => servicioBanners.listarBannersAdmin()
export const obtenerBannerAdmin = (id) => servicioBanners.obtenerBannerAdmin(id)
export const crearBanner = (datos) => servicioBanners.crearBanner(datos)
export const actualizarBanner = (id, datos) => servicioBanners.actualizarBanner(id, datos)
export const eliminarBanner = (id) => servicioBanners.eliminarBanner(id)
