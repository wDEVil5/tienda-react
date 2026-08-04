import { prisma } from '../../lib/prisma.js'

// Aísla Prisma del servicio de pagos. Cliente inyectable para probar sin BD.
export function crearRepositorioPagos(db = prisma) {
  return {
    // Lo justo del pedido para cobrar: estado (¿es pagable?) y total (el monto,
    // verdad del servidor, nunca del cliente).
    async obtenerPedidoParaPago(pedidoId) {
      return db.pedido.findUnique({
        where: { id: pedidoId },
        select: { id: true, numero: true, estado: true, total: true },
      })
    },

    // ¿El pedido ya tiene un pago aprobado? Evita cobrar dos veces.
    async tienePagoAprobado(pedidoId) {
      const pago = await db.pago.findFirst({
        where: { pedidoId, estado: 'APROBADO' },
        select: { id: true },
      })
      return Boolean(pago)
    },

    async crearPago({ pedidoId, proveedor, monto }) {
      return db.pago.create({
        data: { pedidoId, proveedor, monto },
      })
    },

    async fijarReferencia(id, referenciaExterna) {
      return db.pago.update({
        where: { id },
        data: { referenciaExterna },
      })
    },
  }
}

export const repositorioPagos = crearRepositorioPagos()
