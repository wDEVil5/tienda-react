import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { repositorioCategoriasAdmin } from './admin-categorias.repository.js'

export class ErrorCategoriaAdmin extends Error {
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
    throw new ErrorCategoriaAdmin(
      'INVALID_CATEGORY_SLUG',
      'El nombre debe incluir letras o números para generar su URL.',
    )
  }
  return slug
}

export function crearServicioCategoriasAdmin(repositorio = repositorioCategoriasAdmin) {
  return {
    async crearCategoria(datos) {
      return repositorio.crear({
        ...datos,
        slug: datos.slug ?? crearSlug(datos.nombre),
        activa: true,
      })
    },
  }
}

const servicioCategoriasAdmin = crearServicioCategoriasAdmin()

export const crearCategoriaAdmin = servicioCategoriasAdmin.crearCategoria
