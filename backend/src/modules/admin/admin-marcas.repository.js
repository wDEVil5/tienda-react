import { prisma } from '../../lib/prisma.js'

export function crearRepositorioMarcasAdmin(cliente = prisma) {
  return {
    crear(datos) {
      return cliente.marca.create({
        data: datos,
        select: { id: true, nombre: true, slug: true, logoUrl: true },
      })
    },
  }
}

export const repositorioMarcasAdmin = crearRepositorioMarcasAdmin()
