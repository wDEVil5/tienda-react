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

    actualizarNombre(id, nombre) {
      return cliente.usuario.update({
        where: { id },
        data: { nombre },
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

    revocarSesionesDeUsuario(usuarioId, ahora) {
      return cliente.sesion.updateMany({
        where: { usuarioId, revocadaEn: null },
        data: { revocadaEn: ahora },
      })
    },

    // Recuperación de contraseña: cambia la clave y revoca TODAS las sesiones del
    // usuario, transaccional (no hay sesión "actual" que preservar).
    restablecerContrasena({ usuarioId, passwordHash, ahora }) {
      return cliente.$transaction(async (tx) => {
        await tx.usuario.update({ where: { id: usuarioId }, data: { passwordHash } })
        await tx.sesion.updateMany({
          where: { usuarioId, revocadaEn: null },
          data: { revocadaEn: ahora },
        })
      })
    },
  }
}

export const repositorioAuth = crearRepositorioAuth()
