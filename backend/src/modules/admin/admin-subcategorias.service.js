import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { repositorioSubcategoriasAdmin } from './admin-subcategorias.repository.js'

export class ErrorSubcategoriaAdmin extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// El slug se prefija con el de la categoría (igual que el seed) para que sea
// único a nivel global sin chocar entre categorías con subcategorías homónimas.
function crearSlugSubcategoria(categoriaSlug, nombre) {
  const base = normalizarTextoBusqueda(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!base) {
    throw new ErrorSubcategoriaAdmin(
      'INVALID_SUBCATEGORY_SLUG',
      'El nombre debe incluir letras o números para generar su URL.',
    )
  }
  return `${categoriaSlug}-${base}`
}

function proyectar(subcategoria) {
  return {
    id: subcategoria.id,
    nombre: subcategoria.nombre,
    slug: subcategoria.slug,
    orden: subcategoria.orden,
    activa: subcategoria.activa,
  }
}

export function crearServicioSubcategoriasAdmin(repositorio = repositorioSubcategoriasAdmin) {
  return {
    // Devuelve null si la categoría no existe (→ 404 en la ruta).
    async listarPorCategoria(categoriaId) {
      const categoria = await repositorio.obtenerCategoria(categoriaId)
      if (!categoria) return null

      const subcategorias = await repositorio.listarPorCategoria(categoriaId)
      return {
        data: subcategorias.map((sub) => ({
          ...proyectar(sub),
          productosAsignados: sub._count.productos,
          hijas: (sub.subcategoriasHijas ?? []).map((hija) => ({
            ...proyectar(hija),
            productosAsignados: hija._count.productos,
          })),
        })),
      }
    },

    async crear(categoriaId, datos) {
      const categoria = await repositorio.obtenerCategoria(categoriaId)
      if (!categoria) return null

      return proyectar(
        await repositorio.crear({
          nombre: datos.nombre,
          slug: crearSlugSubcategoria(categoria.slug, datos.nombre),
          orden: datos.orden ?? 0,
          categoriaId,
        }),
      )
    },

    async actualizar(id, datos) {
      const existente = await repositorio.obtenerPorId(id)
      if (!existente) return null

      const cambios = { ...datos }
      // Si cambia el nombre, regeneramos el slug con el prefijo de su categoría.
      if (datos.nombre && datos.nombre !== existente.nombre) {
        const categoria = await repositorio.obtenerCategoria(existente.categoriaId)
        cambios.slug = crearSlugSubcategoria(categoria.slug, datos.nombre)
      }

      return proyectar(await repositorio.actualizarPorId(id, cambios))
    },

    async eliminar(id) {
      const existente = await repositorio.obtenerPorId(id)
      if (!existente) return false

      // No borrar si tiene productos: primero hay que reasignarlos (evita dejar
      // productos apuntando a la nada aunque el FK sea SetNull).
      if (existente._count.productos > 0 || (existente._count.subcategoriasHijas ?? 0) > 0) {
        throw new ErrorSubcategoriaAdmin(
          'SUBCATEGORY_HAS_PRODUCTS',
          'Elimina o reasigna primero los productos y niveles hijos de esta subcategoría.',
        )
      }

      await repositorio.eliminar(id)
      return true
    },
  }
}

const servicioSubcategoriasAdmin = crearServicioSubcategoriasAdmin()

export const listarSubcategoriasAdmin = (categoriaId) =>
  servicioSubcategoriasAdmin.listarPorCategoria(categoriaId)
export const crearSubcategoriaAdmin = (categoriaId, datos) =>
  servicioSubcategoriasAdmin.crear(categoriaId, datos)
export const actualizarSubcategoriaAdmin = (id, datos) =>
  servicioSubcategoriasAdmin.actualizar(id, datos)
export const eliminarSubcategoriaAdmin = (id) => servicioSubcategoriasAdmin.eliminar(id)
