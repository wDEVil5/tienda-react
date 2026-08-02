import { prisma } from '../../lib/prisma.js'

export function crearRepositorioUsuariosAdmin(cliente = prisma) {
  return {
    obtenerPorId(id) {
      return cliente.usuario.findUnique({
        where: { id },
        select: { id: true, nombre: true, email: true, rol: true, activo: true },
      })
    },

    async desactivarPorId(id, ahora) {
      return cliente.$transaction(async (transaccion) => {
        const usuario = await transaccion.usuario.update({
          where: { id },
          data: { activo: false },
          select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
        })
        await transaccion.sesion.updateMany({
          where: { usuarioId: id, revocadaEn: null },
          data: { revocadaEn: ahora },
        })
        return usuario
      })
    },

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
