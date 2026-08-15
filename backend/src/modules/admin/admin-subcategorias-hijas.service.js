import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { repositorioSubcategoriasHijasAdmin } from './admin-subcategorias-hijas.repository.js'

export class ErrorSubcategoriaHijaAdmin extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function crearSlug(subcategoriaSlug, nombre) {
  const base = normalizarTextoBusqueda(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!base) {
    throw new ErrorSubcategoriaHijaAdmin('INVALID_CHILD_CATEGORY_SLUG', 'El nombre debe incluir letras o números para generar su URL.')
  }
  return `${subcategoriaSlug}-${base}`
}

function proyectar(item) {
  return { id: item.id, nombre: item.nombre, slug: item.slug, orden: item.orden, activa: item.activa }
}

export function crearServicioSubcategoriasHijasAdmin(repositorio = repositorioSubcategoriasHijasAdmin) {
  return {
    async crear(subcategoriaId, datos) {
      const subcategoria = await repositorio.obtenerSubcategoria(subcategoriaId)
      if (!subcategoria) return null
      return proyectar(await repositorio.crear({
        nombre: datos.nombre,
        slug: crearSlug(subcategoria.slug, datos.nombre),
        orden: datos.orden ?? 0,
        subcategoriaId,
      }))
    },
    async actualizar(id, datos) {
      const existente = await repositorio.obtenerPorId(id)
      if (!existente) return null
      const cambios = { ...datos }
      if (datos.nombre && datos.nombre !== existente.nombre) {
        const subcategoria = await repositorio.obtenerSubcategoria(existente.subcategoriaId)
        cambios.slug = crearSlug(subcategoria.slug, datos.nombre)
      }
      return proyectar(await repositorio.actualizarPorId(id, cambios))
    },
    async eliminar(id) {
      const existente = await repositorio.obtenerPorId(id)
      if (!existente) return false
      if (existente._count.productos > 0) {
        throw new ErrorSubcategoriaHijaAdmin('CHILD_CATEGORY_HAS_PRODUCTS', 'Reasigna los productos de este nivel antes de eliminarlo.')
      }
      await repositorio.eliminar(id)
      return true
    },
  }
}

const servicio = crearServicioSubcategoriasHijasAdmin()
export const crearSubcategoriaHijaAdmin = (subcategoriaId, datos) => servicio.crear(subcategoriaId, datos)
export const actualizarSubcategoriaHijaAdmin = (id, datos) => servicio.actualizar(id, datos)
export const eliminarSubcategoriaHijaAdmin = (id) => servicio.eliminar(id)
