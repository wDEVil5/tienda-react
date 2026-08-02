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
  }
}

export const repositorioAuth = crearRepositorioAuth()
