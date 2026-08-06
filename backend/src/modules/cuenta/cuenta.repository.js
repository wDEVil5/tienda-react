import { prisma } from '../../lib/prisma.js'

// `db` es el cliente de Prisma. Se llama así (y no `cliente`) para no chocar con
// el modelo de dominio Cliente: aquí `db.cliente` es la tabla de compradores.
export function crearRepositorioCuenta(db = prisma) {
  return {
    buscarClienteActivoPorEmail(email) {
      return db.cliente.findFirst({ where: { email, activo: true } })
    },

    buscarClienteActivoPorId(id) {
      return db.cliente.findFirst({ where: { id, activo: true } })
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

    // La clave nueva y la revocación de OTROS dispositivos deben confirmarse
    // juntas: una falla nunca deja la contraseña cambiada con sesiones viejas.
    actualizarContrasenaYRevocarOtrasSesiones({ clienteId, passwordHash, tokenHashActual, ahora }) {
      return db.$transaction(async (tx) => {
        await tx.cliente.update({ where: { id: clienteId }, data: { passwordHash } })
        await tx.sesionCliente.updateMany({
          where: {
            clienteId,
            tokenHash: { not: tokenHashActual },
            revocadaEn: null,
            expiraEn: { gt: ahora },
          },
          data: { revocadaEn: ahora },
        })
      })
    },

    // Recuperación de contraseña: cambia la clave y revoca TODAS las sesiones
    // (no hay sesión "actual" que preservar, a diferencia del cambio con la clave
    // vigente). Transaccional: nunca deja la clave nueva con sesiones viejas vivas.
    restablecerContrasena({ clienteId, passwordHash, ahora }) {
      return db.$transaction(async (tx) => {
        await tx.cliente.update({ where: { id: clienteId }, data: { passwordHash } })
        await tx.sesionCliente.updateMany({
          where: { clienteId, revocadaEn: null, expiraEn: { gt: ahora } },
          data: { revocadaEn: ahora },
        })
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

    // Cierra toda sesión vigente del cliente, incluida la que hizo la petición.
    // No tocamos sesiones ya vencidas o revocadas porque no son reutilizables.
    revocarTodasLasSesiones(clienteId, ahora) {
      return db.sesionCliente.updateMany({
        where: { clienteId, revocadaEn: null, expiraEn: { gt: ahora } },
        data: { revocadaEn: ahora },
      })
    },
  }
}

export const repositorioCuenta = crearRepositorioCuenta()
