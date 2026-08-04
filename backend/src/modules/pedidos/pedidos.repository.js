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

    // Listado para panel y cuenta: además de los conteos, trae la primera imagen
    // vigente de hasta tres productos. Evita una petición por pedido en "Mis
    // pedidos"; si el producto se eliminó, su miniatura simplemente se omite.
    async listar({ page = 1, limit = 20, estado, clienteId } = {}) {
      const where = {
        ...(estado ? { estado } : {}),
        ...(clienteId ? { clienteId } : {}),
      }
      return cliente.pedido.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: {
            select: {
              cantidad: true,
              producto: {
                select: {
                  imagenes: {
                    orderBy: { orden: 'asc' },
                    take: 1,
                    select: { url: true, textoAlternativo: true },
                  },
                },
              },
            },
          },
        },
      })
    },

    async contar({ estado, clienteId } = {}) {
      return cliente.pedido.count({
        where: {
          ...(estado ? { estado } : {}),
          ...(clienteId ? { clienteId } : {}),
        },
      })
    },

    // `clienteId` opcional: sin él (panel) busca por id; con él (cuenta) exige
    // además que el pedido sea de ese cliente, así nadie ve pedidos ajenos.
    async obtenerPorId(id, { clienteId } = {}) {
      return cliente.pedido.findFirst({
        where: { id, ...(clienteId ? { clienteId } : {}) },
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

    // Pedidos PENDIENTE creados antes de `antesDe`: candidatos a expirar. Solo
    // los ids; la expiración vuelve a leer y verifica el estado en su transacción.
    async listarPendientesExpirados(antesDe, limite = 100) {
      return cliente.pedido.findMany({
        where: { estado: 'PENDIENTE', createdAt: { lt: antesDe } },
        orderBy: { createdAt: 'asc' },
        take: limite,
        select: { id: true },
      })
    },

    // Expira un pedido SOLO si sigue PENDIENTE. La guarda atómica (updateMany con
    // estado en el WHERE) evita la carrera con el dueño que lo acepta justo al
    // expirar: si 0 filas cambiaron, ya no estaba pendiente y no se toca el stock.
    // Si expira, libera la reserva (LIBERAR) y registra el evento, todo en una tx.
    async expirarPendienteTransaccional(id, nota) {
      return cliente.$transaction(async (tx) => {
        const { count } = await tx.pedido.updateMany({
          where: { id, estado: 'PENDIENTE' },
          data: { estado: 'CANCELADO' },
        })
        if (count === 0) {
          return null
        }

        const pedido = await tx.pedido.findUnique({ where: { id }, include: { items: true } })
        for (const item of pedido.items) {
          // Un ítem cuyo producto fue eliminado (productoId null) no mueve stock.
          if (!item.productoId) continue
          await tx.producto.update({
            where: { id: item.productoId },
            data: { stockReservado: { decrement: item.cantidad } },
          })
        }

        return tx.pedido.update({
          where: { id },
          data: { eventos: { create: { estado: 'CANCELADO', nota: nota ?? null } } },
          include: { items: true, eventos: { orderBy: { createdAt: 'asc' } } },
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
