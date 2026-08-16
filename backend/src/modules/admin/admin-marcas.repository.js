import { prisma } from '../../lib/prisma.js'

export function crearRepositorioMarcasAdmin(cliente = prisma) {
  return {
    listar() {
      return cliente.marca.findMany({
        select: {
          id: true,
          nombre: true,
          slug: true,
          logoUrl: true,
          logoStorageKey: true,
          brandfetchDomain: true,
          _count: { select: { productos: true } },
        },
        orderBy: { nombre: 'asc' },
      })
    },

    crear(datos) {
      return cliente.marca.create({
        data: datos,
        select: { id: true, nombre: true, slug: true, logoUrl: true, logoStorageKey: true, brandfetchDomain: true },
      })
    },

    obtenerPorId(id) {
      return cliente.marca.findUnique({
        where: { id },
        select: { id: true, nombre: true, slug: true, logoUrl: true, logoStorageKey: true, brandfetchDomain: true },
      })
    },

    actualizarLogo(id, logo) {
      return cliente.marca.update({
        where: { id },
        data: { logoUrl: logo.url, logoStorageKey: logo.storageKey },
        select: { id: true, nombre: true, slug: true, logoUrl: true, logoStorageKey: true, brandfetchDomain: true },
      })
    },

    actualizarDominioBrandfetch(id, brandfetchDomain) {
      return cliente.marca.update({
        where: { id },
        data: { brandfetchDomain },
        select: { id: true, nombre: true, slug: true, logoUrl: true, logoStorageKey: true, brandfetchDomain: true },
      })
    },

    obtenerConConteo(id) {
      return cliente.marca.findUnique({
        where: { id },
        select: { id: true, logoStorageKey: true, _count: { select: { productos: true } } },
      })
    },

    eliminar(id) {
      return cliente.marca.delete({ where: { id } })
    },
  }
}

export const repositorioMarcasAdmin = crearRepositorioMarcasAdmin()
