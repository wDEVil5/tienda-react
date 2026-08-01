import { repositorioMarcas } from './marcas.repository.js'

export function crearServicioMarcas(repositorio = repositorioMarcas) {
  return {
    async listarMarcas() {
      const marcas = await repositorio.listarConProductosPublicados()

      return marcas
        .map(({ id, nombre, logoUrl, _count }) => ({
          id,
          nombre,
          logoUrl,
          productCount: _count.productos,
        }))
        .sort((marcaA, marcaB) => marcaA.nombre.localeCompare(marcaB.nombre, 'es'))
    },
  }
}

const servicioMarcas = crearServicioMarcas()

export const listarMarcas = servicioMarcas.listarMarcas
