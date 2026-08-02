import { prisma } from '../../lib/prisma.js'

export function crearRepositorioMarcasAdmin(cliente = prisma) {
  return {
    crear(datos) {
      return cliente.marca.create({
        data: datos,
        select: { id: true, nombre: true, slug: true, logoUrl: true, logoStorageKey: true },
      })
    },

    obtenerPorId(id) {
      return cliente.marca.findUnique({
        where: { id },
        select: { id: true, nombre: true, slug: true, logoUrl: true, logoStorageKey: true },
      })
    },

    actualizarLogo(id, logo) {
      return cliente.marca.update({
        where: { id },
        data: { logoUrl: logo.url, logoStorageKey: logo.storageKey },
        select: { id: true, nombre: true, slug: true, logoUrl: true, logoStorageKey: true },
      })
    },
  }
}

export const repositorioMarcasAdmin = crearRepositorioMarcasAdmin()
