import { prisma } from '../../lib/prisma.js'

export function crearRepositorioUsuariosAdmin(cliente = prisma) {
  return {
    crear(datos) {
      return cliente.usuario.create({
        data: datos,
        select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
      })
    },
  }
}

export const repositorioUsuariosAdmin = crearRepositorioUsuariosAdmin()
