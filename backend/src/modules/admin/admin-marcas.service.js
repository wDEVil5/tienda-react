import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { repositorioMarcasAdmin } from './admin-marcas.repository.js'

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

export function crearServicioMarcasAdmin(repositorio = repositorioMarcasAdmin) {
  return {
    async crearMarca(datos) {
      return repositorio.crear({
        ...datos,
        slug: datos.slug ?? crearSlug(datos.nombre),
      })
    },
  }
}

const servicioMarcasAdmin = crearServicioMarcasAdmin()

export const crearMarcaAdmin = servicioMarcasAdmin.crearMarca
