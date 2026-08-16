import { prisma } from '../../lib/prisma.js'

// Aísla Prisma del servicio del boletín. Recibe el cliente como dependencia para
// poder probar la lógica sin abrir PostgreSQL.
export function crearRepositorioNewsletter(db = prisma) {
  return {
    async buscarPorEmail(email) {
      return db.suscriptor.findUnique({ where: { email } })
    },

    async crear({ email, clienteId = null }) {
      return db.suscriptor.create({ data: { email, clienteId } })
    },

    // Un correo que se había dado de baja vuelve a quedar ACTIVO. Se reengancha
    // a la sesión de cliente si la hay y se limpia la fecha de baja.
    async reactivar(id, { clienteId = null } = {}) {
      return db.suscriptor.update({
        where: { id },
        data: { estado: 'ACTIVO', bajaEn: null, clienteId },
      })
    },

    // Baja por token (enlace "cancelar con un clic" del correo). Si el token no
    // existe, Prisma lanza P2025 y devolvemos null (la ruta responde 404).
    async darDeBaja(token) {
      try {
        return await db.suscriptor.update({
          where: { token },
          data: { estado: 'BAJA', bajaEn: new Date() },
        })
      } catch (error) {
        if (error.code === 'P2025') return null
        throw error
      }
    },

    // Baja por email: la usa la preferencia del cliente desde su cuenta (no tiene
    // el token del correo). Devuelve null si ese email no estaba suscrito.
    async darDeBajaPorEmail(email) {
      try {
        return await db.suscriptor.update({
          where: { email },
          data: { estado: 'BAJA', bajaEn: new Date() },
        })
      } catch (error) {
        if (error.code === 'P2025') return null
        throw error
      }
    },
  }
}

export const repositorioNewsletter = crearRepositorioNewsletter()
