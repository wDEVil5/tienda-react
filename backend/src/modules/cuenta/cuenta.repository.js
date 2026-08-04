import { prisma } from '../../lib/prisma.js'

// `db` es el cliente de Prisma. Se llama así (y no `cliente`) para no chocar con
// el modelo de dominio Cliente: aquí `db.cliente` es la tabla de compradores.
export function crearRepositorioCuenta(db = prisma) {
  return {
    buscarClienteActivoPorEmail(email) {
      return db.cliente.findFirst({ where: { email, activo: true } })
    },

    crearCliente({ nombre, email, passwordHash, telefono }) {
      return db.cliente.create({
        data: { nombre, email, passwordHash, telefono },
      })
    },

    // El id viene siempre de una sesión validada; nunca de un campo enviado
    // por el navegador. Email y passwordHash no pertenecen a este update.
    actualizarPerfilCliente(id, { nombre, telefono }) {
      return db.cliente.update({
        where: { id },
        data: { nombre, telefono },
      })
    },

    crearSesion({ clienteId, tokenHash, expiraEn }) {
      return db.sesionCliente.create({
        data: { clienteId, tokenHash, expiraEn },
      })
    },

    buscarSesionActivaPorHash(tokenHash, ahora) {
      return db.sesionCliente.findFirst({
        where: {
          tokenHash,
          revocadaEn: null,
          expiraEn: { gt: ahora },
          cliente: { activo: true },
        },
        include: { cliente: true },
      })
    },

    revocarSesionPorHash(tokenHash, ahora) {
      return db.sesionCliente.updateMany({
        where: { tokenHash, revocadaEn: null, expiraEn: { gt: ahora } },
        data: { revocadaEn: ahora },
      })
    },
  }
}

export const repositorioCuenta = crearRepositorioCuenta()
