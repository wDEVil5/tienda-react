import { repositorioReferenciasAdmin } from './admin-referencias.repository.js'

export function crearServicioReferenciasAdmin(repositorio = repositorioReferenciasAdmin) {
  return {
    async listarOpcionesProducto() {
      const [categorias, marcas, etiquetas] = await Promise.all([
        repositorio.listarCategoriasActivas(),
        repositorio.listarMarcas(),
        repositorio.listarEtiquetas(),
      ])

      return { data: { categorias, marcas, etiquetas } }
    },
  }
}

const servicioReferenciasAdmin = crearServicioReferenciasAdmin()

export const listarOpcionesProductoAdmin = servicioReferenciasAdmin.listarOpcionesProducto
