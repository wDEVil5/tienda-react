import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { repositorioEtiquetasAdmin } from './admin-etiquetas.repository.js'

export class ErrorEtiquetaAdmin extends Error {
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
    throw new ErrorEtiquetaAdmin(
      'INVALID_TAG_SLUG',
      'El nombre debe incluir letras o números para generar su URL.',
    )
  }
  return slug
}

export function crearServicioEtiquetasAdmin(repositorio = repositorioEtiquetasAdmin) {
  return {
    async listarEtiquetas() {
      const etiquetas = await repositorio.listar()
      return {
        data: etiquetas.map((etiqueta) => ({
          id: etiqueta.id,
          nombre: etiqueta.nombre,
          slug: etiqueta.slug,
          productosAsignados: etiqueta._count.productos,
        })),
      }
    },

    async crearEtiqueta(datos) {
      return repositorio.crear({
        ...datos,
        slug: datos.slug ?? crearSlug(datos.nombre),
      })
    },
  }
}

const servicioEtiquetasAdmin = crearServicioEtiquetasAdmin()

export const crearEtiquetaAdmin = servicioEtiquetasAdmin.crearEtiqueta
export const listarEtiquetasAdmin = servicioEtiquetasAdmin.listarEtiquetas
