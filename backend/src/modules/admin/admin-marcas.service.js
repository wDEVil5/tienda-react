import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { repositorioMarcasAdmin } from './admin-marcas.repository.js'
import { almacenamientoImagenes } from '../imagenes/imagenes.storage.js'

export class ErrorMarcaAdmin extends Error {
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
    throw new ErrorMarcaAdmin(
      'INVALID_BRAND_SLUG',
      'El nombre debe incluir letras o números para generar su URL.',
    )
  }
  return slug
}

export function crearServicioMarcasAdmin(
  repositorio = repositorioMarcasAdmin,
  almacenamiento = almacenamientoImagenes,
) {
  return {
    async listarMarcas() {
      const marcas = await repositorio.listar()
      return {
        data: marcas.map((marca) => ({
          id: marca.id,
          nombre: marca.nombre,
          slug: marca.slug,
          logoUrl: marca.logoUrl,
          brandfetchDomain: marca.brandfetchDomain,
          productosAsignados: marca._count.productos,
        })),
      }
    },

    async asignarLogoMarca(id, logo) {
      const marcaActual = await repositorio.obtenerPorId(id)
      if (!marcaActual) return null

      let marcaActualizada
      try {
        marcaActualizada = await repositorio.actualizarLogo(id, logo)
      } catch (error) {
        // Si la base rechaza el cambio, la imagen recién subida no debe quedar huérfana.
        await almacenamiento.eliminarLogoMarca(logo.storageKey).catch(() => {})
        throw error
      }

      if (marcaActual.logoStorageKey && marcaActual.logoStorageKey !== logo.storageKey) {
        await almacenamiento.eliminarLogoMarca(marcaActual.logoStorageKey).catch(() => {})
      }
      return marcaActualizada
    },

    // El dominio se guarda separado del logo propio. Así una marca puede
    // volver a Brandfetch o usar Cloudinary sin perder la configuración.
    async actualizarDominioBrandfetch(id, brandfetchDomain) {
      const marca = await repositorio.obtenerPorId(id)
      if (!marca) return null
      return repositorio.actualizarDominioBrandfetch(id, brandfetchDomain?.toLowerCase() ?? null)
    },

    async crearMarca(datos) {
      return repositorio.crear({
        ...datos,
        brandfetchDomain: datos.brandfetchDomain?.toLowerCase() ?? null,
        slug: datos.slug ?? crearSlug(datos.nombre),
      })
    },
  }
}

const servicioMarcasAdmin = crearServicioMarcasAdmin()

export const crearMarcaAdmin = servicioMarcasAdmin.crearMarca
export const asignarLogoMarcaAdmin = servicioMarcasAdmin.asignarLogoMarca
export const listarMarcasAdmin = servicioMarcasAdmin.listarMarcas
export const actualizarDominioBrandfetchAdmin = servicioMarcasAdmin.actualizarDominioBrandfetch
