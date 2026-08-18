import { repositorioReferenciasAdmin } from './admin-referencias.repository.js'

export function crearServicioReferenciasAdmin(repositorio = repositorioReferenciasAdmin) {
  return {
    async listarOpcionesProducto() {
      const [categorias, subcategorias, subcategoriasHijas, marcas, etiquetas] = await Promise.all([
        repositorio.listarCategoriasActivas(),
        repositorio.listarSubcategoriasActivas(),
        repositorio.listarSubcategoriasHijasActivas(),
        repositorio.listarMarcas(),
        repositorio.listarEtiquetas(),
      ])

      return { data: { categorias, subcategorias, subcategoriasHijas, marcas, etiquetas } }
    },
  }
}

const servicioReferenciasAdmin = crearServicioReferenciasAdmin()

export const listarOpcionesProductoAdmin = servicioReferenciasAdmin.listarOpcionesProducto
