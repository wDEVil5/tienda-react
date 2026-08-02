import { prisma } from '../../lib/prisma.js'

export function crearRepositorioUsuariosAdmin(cliente = prisma) {
  return {
    listar() {
      return cliente.usuario.findMany({
        select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      })
    },

    crear(datos) {
      return cliente.usuario.create({
        data: datos,
        select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
      })
    },
  }
}

export const repositorioUsuariosAdmin = crearRepositorioUsuariosAdmin()
