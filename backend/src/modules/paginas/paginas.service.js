import {
  PAGINAS_CONTENIDO,
  esSlugValido,
  tituloPorDefecto,
} from '../../lib/paginasContenido.js'
import { repositorioPaginas } from './paginas.repository.js'

export function crearServicioPaginas(repositorio = repositorioPaginas) {
  return {
    // Página PÚBLICA: solo si el slug es canónico, existe y está publicada. En
    // cualquier otro caso devuelve null → 404 (una página despublicada no debe
    // distinguirse de una inexistente para el visitante).
    async obtenerPaginaPublica(slug) {
      if (!esSlugValido(slug)) return null
      const pagina = await repositorio.obtenerPorSlug(slug)
      if (!pagina || !pagina.publicada) return null
      return {
        slug: pagina.slug,
        titulo: pagina.titulo,
        cuerpo: pagina.cuerpo,
        updatedAt: pagina.updatedAt,
      }
    },

    // Lista para el panel: las 4 páginas canónicas SIEMPRE, marcando cuáles ya
    // existen en la base y su estado (publicada / borrador / sin crear).
    async listarPaginasAdmin() {
      const filas = await repositorio.listar()
      const porSlug = new Map(filas.map((fila) => [fila.slug, fila]))
      return PAGINAS_CONTENIDO.map((canonica) => {
        const fila = porSlug.get(canonica.slug)
        return {
          slug: canonica.slug,
          titulo: fila?.titulo ?? canonica.titulo,
          existe: Boolean(fila),
          publicada: fila?.publicada ?? false,
          updatedAt: fila?.updatedAt ?? null,
        }
      })
    },

    // Página para EDITAR: si el slug no es canónico → null (404). Si aún no existe
    // la fila, devuelve una plantilla en blanco (título por defecto, cuerpo vacío,
    // borrador) para que el editor la cree al guardar.
    async obtenerPaginaAdmin(slug) {
      if (!esSlugValido(slug)) return null
      const pagina = await repositorio.obtenerPorSlug(slug)
      if (!pagina) {
        return { slug, titulo: tituloPorDefecto(slug), cuerpo: '', publicada: false, existe: false }
      }
      return {
        slug: pagina.slug,
        titulo: pagina.titulo,
        cuerpo: pagina.cuerpo,
        publicada: pagina.publicada,
        existe: true,
      }
    },

    // Guarda (upsert) una página. Rechaza slugs fuera del conjunto canónico.
    async guardarPaginaAdmin(slug, datos) {
      if (!esSlugValido(slug)) return null
      const pagina = await repositorio.guardar(slug, datos)
      return {
        slug: pagina.slug,
        titulo: pagina.titulo,
        cuerpo: pagina.cuerpo,
        publicada: pagina.publicada,
        existe: true,
      }
    },
  }
}

const servicioPaginas = crearServicioPaginas()

export const obtenerPaginaPublica = (slug) => servicioPaginas.obtenerPaginaPublica(slug)
export const listarPaginasAdmin = () => servicioPaginas.listarPaginasAdmin()
export const obtenerPaginaAdmin = (slug) => servicioPaginas.obtenerPaginaAdmin(slug)
export const guardarPaginaAdmin = (slug, datos) => servicioPaginas.guardarPaginaAdmin(slug, datos)
