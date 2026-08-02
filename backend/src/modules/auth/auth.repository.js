import { prisma } from '../../lib/prisma.js'

export function crearRepositorioAuth(cliente = prisma) {
  return {
    buscarUsuarioActivoPorEmail(email) {
      return cliente.usuario.findFirst({
        where: { email, activo: true },
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
