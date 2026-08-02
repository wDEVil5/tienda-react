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
    async activarCategoria(id) {
      const categoria = await repositorio.obtenerPorId(id)
      if (!categoria) return null

      return repositorio.actualizarPorId(id, { activa: true })
    },

    async desactivarCategoria(id) {
      const categoria = await repositorio.obtenerPorId(id)
      if (!categoria) return null

      if (categoria._count.productos > 0) {
        throw new ErrorCategoriaAdmin(
          'CATEGORY_HAS_PRODUCTS',
          'Reasigna los productos antes de desactivar esta categoría.',
        )
      }

      return repositorio.actualizarPorId(id, { activa: false })
    },

    async listarCategorias() {
      const categorias = await repositorio.listar()
      return {
        data: categorias.map((categoria) => ({
          id: categoria.id,
          nombre: categoria.nombre,
          slug: categoria.slug,
          activa: categoria.activa,
          productosAsignados: categoria._count.productos,
        })),
      }
    },

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
export const listarCategoriasAdmin = servicioCategoriasAdmin.listarCategorias
export const desactivarCategoriaAdmin = servicioCategoriasAdmin.desactivarCategoria
export const activarCategoriaAdmin = servicioCategoriasAdmin.activarCategoria
