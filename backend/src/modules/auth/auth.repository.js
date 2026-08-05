import { prisma } from '../../lib/prisma.js'

export function crearRepositorioAuth(cliente = prisma) {
  return {
    buscarUsuarioActivoPorEmail(email) {
      return cliente.usuario.findFirst({
        where: { email, activo: true },
      })
    },

    buscarUsuarioActivoPorId(id) {
      return cliente.usuario.findFirst({
        where: { id, activo: true },
      })
    },

    actualizarContrasena(id, passwordHash) {
      return cliente.usuario.update({
        where: { id },
        data: { passwordHash },
      })
    },

    crearSesion({ usuarioId, tokenHash, expiraEn }) {
      return cliente.sesion.create({
        data: { usuarioId, tokenHash, expiraEn },
      })
    },

    buscarSesionActivaPorHash(tokenHash, ahora) {
      return cliente.sesion.findFirst({
        where: {
          tokenHash,
          revocadaEn: null,
          expiraEn: { gt: ahora },
          usuario: { activo: true },
        },
        include: { usuario: true },
      })
    },

    revocarSesionPorHash(tokenHash, ahora) {
      return cliente.sesion.updateMany({
        where: {
          tokenHash,
          revocadaEn: null,
          expiraEn: { gt: ahora },
        },
        data: { revocadaEn: ahora },
      })
    },
  }
}

export const repositorioAuth = crearRepositorioAuth()
