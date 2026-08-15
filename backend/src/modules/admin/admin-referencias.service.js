import { repositorioReferenciasAdmin } from './admin-referencias.repository.js'

export function crearServicioReferenciasAdmin(repositorio = repositorioReferenciasAdmin) {
  return {
    async listarOpcionesProducto() {
      const [categorias, subcategorias, marcas, etiquetas] = await Promise.all([
        repositorio.listarCategoriasActivas(),
        repositorio.listarSubcategoriasActivas(),
        repositorio.listarMarcas(),
        repositorio.listarEtiquetas(),
      ])

      return { data: { categorias, subcategorias, marcas, etiquetas } }
    },
  }
}

const servicioReferenciasAdmin = crearServicioReferenciasAdmin()

export const listarOpcionesProductoAdmin = servicioReferenciasAdmin.listarOpcionesProducto
