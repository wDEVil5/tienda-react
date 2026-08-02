import { prisma } from '../../lib/prisma.js'

// Todas las operaciones van SIEMPRE acotadas por clienteId: un cliente nunca
// puede ver ni tocar direcciones de otro. La invariante "una sola predeterminada"
// se mantiene en transacciones.
export function crearRepositorioDirecciones(db = prisma) {
  return {
    listarPorCliente(clienteId) {
      return db.direccion.findMany({
        where: { clienteId },
        orderBy: [{ predeterminada: 'desc' }, { createdAt: 'desc' }],
      })
    },

    contarPorCliente(clienteId) {
      return db.direccion.count({ where: { clienteId } })
    },

    crear({ clienteId, datos, hacerPredeterminada }) {
      return db.$transaction(async (tx) => {
        if (hacerPredeterminada) {
          await tx.direccion.updateMany({
            where: { clienteId, predeterminada: true },
            data: { predeterminada: false },
          })
        }
        return tx.direccion.create({
          data: { clienteId, ...datos, predeterminada: hacerPredeterminada },
        })
      })
    },

    actualizar({ id, clienteId, datos, hacerPredeterminada }) {
      return db.$transaction(async (tx) => {
        const existente = await tx.direccion.findFirst({ where: { id, clienteId } })
        if (!existente) return null

        if (hacerPredeterminada) {
          await tx.direccion.updateMany({
            where: { clienteId, NOT: { id } },
            data: { predeterminada: false },
          })
        }

        // predeterminada solo se toca para ACTIVARLA; nunca se desmarca por aquí,
        // así siempre queda al menos una default una vez que existe.
        return tx.direccion.update({
          where: { id },
          data: { ...datos, ...(hacerPredeterminada ? { predeterminada: true } : {}) },
        })
      })
    },

    eliminar({ id, clienteId }) {
      return db.$transaction(async (tx) => {
        const existente = await tx.direccion.findFirst({ where: { id, clienteId } })
        if (!existente) return false

        await tx.direccion.delete({ where: { id } })

        // Si se borró la predeterminada, promover la más reciente que quede.
        if (existente.predeterminada) {
          const otra = await tx.direccion.findFirst({
            where: { clienteId },
            orderBy: { createdAt: 'desc' },
          })
          if (otra) {
            await tx.direccion.update({
              where: { id: otra.id },
              data: { predeterminada: true },
            })
          }
        }
        return true
      })
    },
  }
}

export const repositorioDirecciones = crearRepositorioDirecciones()
