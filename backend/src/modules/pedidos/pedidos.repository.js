import { prisma } from '../../lib/prisma.js'
import { ErrorPedido } from './pedidos.errores.js'

function crearPromocionVigenteDonde(ahora) {
  return { activa: true, empiezaEn: { lte: ahora }, terminaEn: { gt: ahora } }
}

/**
 * Aísla Prisma del servicio de pedidos. Se le puede inyectar un cliente de
 * transacción o de prueba, igual que el resto de los repositorios del backend.
 */
export function crearRepositorioPedidos(cliente = prisma) {
  return {
    // Trae SOLO productos publicados, con su stock y si tienen una oferta
    // vigente AHORA. El servicio recalcula precios con esta verdad del servidor.
    async obtenerParaPedido(ids, ahora = new Date()) {
      const productos = await cliente.producto.findMany({
        where: { estado: 'PUBLICADO', id: { in: ids } },
        select: {
          id: true,
          sku: true,
          nombre: true,
          precio: true,
          precioAnterior: true,
          stock: true,
          stockReservado: true,
          promociones: {
            where: { promocion: crearPromocionVigenteDonde(ahora) },
            select: { promocionId: true },
            take: 1,
          },
        },
      })

      return productos.map((producto) => ({
        id: producto.id,
        sku: producto.sku,
        nombre: producto.nombre,
        precio: producto.precio,
        precioAnterior: producto.precioAnterior,
        stock: producto.stock,
        stockReservado: producto.stockReservado,
        tieneOfertaVigente: producto.promociones.length > 0,
      }))
    },

    // Listado para el panel: el más reciente primero. Incluye la cantidad de
    // cada ítem para poder mostrar "N productos, M unidades" sin otra consulta.
    async listar({ page = 1, limit = 20, estado } = {}) {
      const where = estado ? { estado } : {}
      return cliente.pedido.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: { select: { cantidad: true } } },
      })
    },

    async contar({ estado } = {}) {
      return cliente.pedido.count({ where: estado ? { estado } : {} })
    },

    async obtenerPorId(id) {
      return cliente.pedido.findUnique({
        where: { id },
        include: {
          items: true,
          eventos: { orderBy: { createdAt: 'asc' } },
        },
      })
    },

    // Reserva stock y crea pedido + ítems + evento inicial en UNA transacción:
    // o se guarda todo, o nada.
    async crearPedidoTransaccional({ pedido, items }) {
      return cliente.$transaction(async (tx) => {
        for (const item of items) {
          // Reserva atómica: incrementa stock_reservado solo si de verdad queda
          // disponible. La condición compara ambas columnas dentro del UPDATE, así
          // que dos pedidos simultáneos no pueden reservar la misma unidad. Si
          // afecta 0 filas, alguien se adelantó y no hay stock.
          const reservados = await tx.$executeRaw`
            UPDATE productos
            SET stock_reservado = stock_reservado + ${item.cantidad}
            WHERE id = ${item.productoId}::uuid
              AND stock - stock_reservado >= ${item.cantidad}
          `

          if (reservados === 0) {
            throw new ErrorPedido(
              'INSUFFICIENT_STOCK',
              `No hay stock suficiente de ${item.nombre}.`,
            )
          }
        }

        return tx.pedido.create({
          data: {
            ...pedido,
            items: { create: items },
            // El primer evento congela el inicio de la línea de tiempo.
            eventos: { create: { estado: pedido.estado } },
          },
          include: {
            items: true,
            eventos: { orderBy: { createdAt: 'asc' } },
          },
        })
      })
    },

    // Cambia el estado, mueve el stock según el efecto y registra el evento, todo
    // en una transacción. El efecto ya viene decidido por el servicio.
    async cambiarEstadoTransaccional({ id, nuevoEstado, nota, efecto, items }) {
      return cliente.$transaction(async (tx) => {
        if (efecto !== 'NINGUNO') {
          for (const item of items) {
            // Un ítem cuyo producto fue eliminado (productoId null) no mueve stock.
            if (!item.productoId) continue

            const data =
              efecto === 'CONSUMIR'
                ? { stock: { decrement: item.cantidad }, stockReservado: { decrement: item.cantidad } }
                : efecto === 'LIBERAR'
                  ? { stockReservado: { decrement: item.cantidad } }
                  : { stock: { increment: item.cantidad } } // RESTITUIR

            await tx.producto.update({ where: { id: item.productoId }, data })
          }
        }

        return tx.pedido.update({
          where: { id },
          data: {
            estado: nuevoEstado,
            eventos: { create: { estado: nuevoEstado, nota: nota ?? null } },
          },
          include: {
            items: true,
            eventos: { orderBy: { createdAt: 'asc' } },
          },
        })
      })
    },
  }
}

export const repositorioPedidos = crearRepositorioPedidos()
