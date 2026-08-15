import { normalizarTextoBusqueda } from '../../lib/texto.js'
import { repositorioAtributosAdmin } from './admin-atributos.repository.js'

export class ErrorAtributoAdmin extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function crearSlug(prefijo, nombre) {
  const base = normalizarTextoBusqueda(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!base) {
    throw new ErrorAtributoAdmin(
      'INVALID_ATTRIBUTE_SLUG',
      'El nombre debe incluir letras o números para generar su URL.',
    )
  }
  return `${prefijo}-${base}`
}

function proyectarOpcion(item) {
  return {
    id: item.id,
    nombre: item.nombre,
    slug: item.slug,
    orden: item.orden,
    activa: item.activa,
    productosAsignados: item._count?.valores ?? 0,
  }
}

function proyectar(item) {
  return {
    id: item.id,
    nombre: item.nombre,
    slug: item.slug,
    tipo: item.tipo,
    orden: item.orden,
    activo: item.activo,
    productosAsignados: item._count?.valores ?? 0,
    opciones: (item.opciones ?? []).map(proyectarOpcion),
  }
}

export function crearServicioAtributosAdmin(repo = repositorioAtributosAdmin) {
  return {
    async listar(categoriaId) {
      if (!await repo.categoria(categoriaId)) return null
      return { data: (await repo.listar(categoriaId)).map(proyectar) }
    },

    async crear(categoriaId, datos) {
      const categoria = await repo.categoria(categoriaId)
      if (!categoria) return null
      return proyectar(await repo.crearAtributo({
        ...datos, slug: crearSlug(categoria.slug, datos.nombre), categoriaId,
      }))
    },

    async actualizar(id, datos) {
      const actual = await repo.atributo(id)
      if (!actual) return null
      const cambios = { ...datos }
      if (datos.nombre && datos.nombre !== actual.nombre) {
        const categoria = await repo.categoria(actual.categoriaId)
        cambios.slug = crearSlug(categoria.slug, datos.nombre)
      }
      return proyectar(await repo.actualizarAtributo(id, cambios))
    },

    async eliminar(id) {
      const actual = await repo.atributo(id)
      if (!actual) return false
      if (actual._count.valores || actual.opciones.length) {
        throw new ErrorAtributoAdmin(
          'ATTRIBUTE_IN_USE',
          'Elimina primero las opciones y valores de este atributo.',
        )
      }
      await repo.eliminarAtributo(id)
      return true
    },

    async crearOpcion(atributoId, datos) {
      const atributo = await repo.atributo(atributoId)
      if (!atributo) return null
      return proyectarOpcion(await repo.crearOpcion({
        ...datos, slug: crearSlug(atributo.slug, datos.nombre), atributoId,
      }))
    },

    async actualizarOpcion(id, datos) {
      const actual = await repo.opcion(id)
      if (!actual) return null
      const cambios = { ...datos }
      if (datos.nombre && datos.nombre !== actual.nombre) {
        const atributo = await repo.atributo(actual.atributoId)
        cambios.slug = crearSlug(atributo.slug, datos.nombre)
      }
      return proyectarOpcion(await repo.actualizarOpcion(id, cambios))
    },

    async eliminarOpcion(id) {
      const actual = await repo.opcion(id)
      if (!actual) return false
      if (actual._count.valores) {
        throw new ErrorAtributoAdmin(
          'ATTRIBUTE_OPTION_IN_USE',
          'Reasigna los productos antes de eliminar esta opción.',
        )
      }
      await repo.eliminarOpcion(id)
      return true
    },
  }
}
const servicio = crearServicioAtributosAdmin()
export const listarAtributosAdmin = (id) => servicio.listar(id)
export const crearAtributoAdmin = (id, datos) => servicio.crear(id, datos)
export const actualizarAtributoAdmin = (id, datos) => servicio.actualizar(id, datos)
export const eliminarAtributoAdmin = (id) => servicio.eliminar(id)
export const crearOpcionAtributoAdmin = (id, datos) => servicio.crearOpcion(id, datos)
export const actualizarOpcionAtributoAdmin = (id, datos) => servicio.actualizarOpcion(id, datos)
export const eliminarOpcionAtributoAdmin = (id) => servicio.eliminarOpcion(id)
