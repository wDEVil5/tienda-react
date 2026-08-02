import { prisma } from '../../lib/prisma.js'

export function crearRepositorioCategoriasAdmin(cliente = prisma) {
  return {
    crear(datos) {
      return cliente.categoria.create({
        data: datos,
        select: { id: true, nombre: true, slug: true, activa: true },
      })
    },
  }
}

export const repositorioCategoriasAdmin = crearRepositorioCategoriasAdmin()
