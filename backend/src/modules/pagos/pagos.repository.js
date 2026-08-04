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

    // El webhook encuentra su pago por la referencia del proveedor.
    async buscarPorReferencia(referenciaExterna) {
      return db.pago.findUnique({
        where: { referenciaExterna },
        select: { id: true, estado: true, pedidoId: true },
      })
    },

    // Aprueba el pago y, si el pedido sigue pendiente, CONSUME el stock (la
    // reserva pasa a venta) y avanza el pedido a PREPARANDO. Todo en una tx.
    // - Guarda idempotente: updateMany where estado=PENDIENTE. Si cambia 0 filas,
    //   la notificación ya se procesó y no se consume de nuevo.
    // - Guarda del pedido: si expiró/canceló entretanto, el pago queda APROBADO
    //   pero NO se toca el stock (caso a reembolsar; no corrompe inventario).
    async aprobarPagoTransaccional(pagoId) {
      return db.$transaction(async (tx) => {
        const { count } = await tx.pago.updateMany({
          where: { id: pagoId, estado: 'PENDIENTE' },
          data: { estado: 'APROBADO' },
        })
        if (count === 0) {
          return { aplicado: false, motivo: 'YA_PROCESADO' }
        }

        const pago = await tx.pago.findUnique({
          where: { id: pagoId },
          include: { pedido: { include: { items: true } } },
        })
        const pedido = pago.pedido

        if (pedido.estado !== 'PENDIENTE') {
          return { aplicado: true, consumido: false, motivo: 'PEDIDO_NO_PENDIENTE' }
        }

        for (const item of pedido.items) {
          if (!item.productoId) continue
          await tx.producto.update({
            where: { id: item.productoId },
            data: {
              stock: { decrement: item.cantidad },
              stockReservado: { decrement: item.cantidad },
            },
          })
        }

        await tx.pedido.update({
          where: { id: pedido.id },
          data: {
            estado: 'PREPARANDO',
            eventos: { create: { estado: 'PREPARANDO', nota: 'Pago aprobado' } },
          },
        })

        return { aplicado: true, consumido: true }
      })
    },

    // Rechaza el pago: el pedido sigue PENDIENTE (puede reintentarse o expira). No
    // mueve stock. Guarda idempotente igual que la aprobación.
    async rechazarPagoTransaccional(pagoId) {
      const { count } = await db.pago.updateMany({
        where: { id: pagoId, estado: 'PENDIENTE' },
        data: { estado: 'RECHAZADO' },
      })
      return { aplicado: count > 0 }
    },
  }
}

export const repositorioPagos = crearRepositorioPagos()
