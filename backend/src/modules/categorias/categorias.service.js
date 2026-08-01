import { repositorioCategorias } from './categorias.repository.js'

export function crearServicioCategorias(repositorio = repositorioCategorias) {
  return {
    async listarCategorias() {
      const categorias = await repositorio.listarConProductosPublicados()

      return categorias
        .map(({ _count, ...categoria }) => ({
          ...categoria,
          productCount: _count.productos,
        }))
        // La colación de PostgreSQL puede variar entre sistemas; la API conserva
        // el orden español que ya presentaba el catálogo antes de persistirlo.
        .sort((categoriaA, categoriaB) =>
          categoriaA.nombre.localeCompare(categoriaB.nombre, 'es'),
        )
    },
  }
}

const servicioCategorias = crearServicioCategorias()

export const listarCategorias = servicioCategorias.listarCategorias
