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
  }
}

export const repositorioNewsletter = crearRepositorioNewsletter()
