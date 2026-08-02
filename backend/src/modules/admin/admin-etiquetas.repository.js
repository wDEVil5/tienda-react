import { prisma } from '../../lib/prisma.js'

export function crearRepositorioEtiquetasAdmin(cliente = prisma) {
  return {
    crear(datos) {
      return cliente.etiqueta.create({
        data: datos,
        select: { id: true, nombre: true, slug: true },
      })
    },
  }
}

export const repositorioEtiquetasAdmin = crearRepositorioEtiquetasAdmin()
