import { prisma } from '../../lib/prisma.js'

/**
 * Consultas de agregación para el tablero de Resumen. Se aíslan de Prisma como
 * el resto de los repositorios, para poder inyectar un cliente de prueba.
 */
export function crearRepositorioResumen(cliente = prisma) {
  return {
    // Ventas = dinero realmente recibido: suma de pagos APROBADO en el rango,
    // más cuántos pagos fueron (para el ticket promedio). El rango es
    // semiabierto [desde, hasta) para no contar dos veces en los bordes.
    async ventasAprobadas({ desde, hasta }) {
      const { _sum, _count } = await cliente.pago.aggregate({
        _sum: { monto: true },
        _count: true,
        where: { estado: 'APROBADO', createdAt: { gte: desde, lt: hasta } },
      })
      return { monto: _sum.monto ?? 0, pagos: _count }
    },

    // Mismo dinero aprobado, partido por modalidad del pedido. Se resuelve con
    // dos agregaciones filtrando por la relación (pedido.modalidad), sin SQL
    // crudo: el volumen de pagos aprobados es acotado.
    async ventasPorModalidad({ desde, hasta }) {
      const dondePara = (modalidad) => ({
        estado: 'APROBADO',
        createdAt: { gte: desde, lt: hasta },
        pedido: { modalidad },
      })
      const [retiro, despacho] = await Promise.all([
        cliente.pago.aggregate({ _sum: { monto: true }, where: dondePara('RETIRO') }),
        cliente.pago.aggregate({ _sum: { monto: true }, where: dondePara('DESPACHO') }),
      ])
      return { retiro: retiro._sum.monto ?? 0, despacho: despacho._sum.monto ?? 0 }
    },

    // Pedidos reales del período: los creados en el rango que no fueron
    // cancelados (un pedido cancelado se colocó, pero no cuenta como venta).
    async contarPedidos({ desde, hasta }) {
      return cliente.pedido.count({
        where: { createdAt: { gte: desde, lt: hasta }, estado: { not: 'CANCELADO' } },
      })
    },

    // Pedidos que esperan acción del dueño AHORA (no acotado al período): los
    // PENDIENTE aún sin aceptar/preparar. Es una alerta operativa, no histórica.
    async contarPendientesPreparar() {
      return cliente.pedido.count({ where: { estado: 'PENDIENTE' } })
    },

    // Productos vendidos en la ventana: agrupa las líneas de pedido por nombre
    // (snapshot) y suma unidades e ingresos. Solo cuenta ítems de pedidos con un
    // pago APROBADO en el rango, para ser coherente con la definición de ventas.
    async masVendidos({ desde, hasta }) {
      const grupos = await cliente.itemPedido.groupBy({
        by: ['nombre'],
        where: {
          pedido: { pagos: { some: { estado: 'APROBADO', createdAt: { gte: desde, lt: hasta } } } },
        },
        _sum: { cantidad: true, subtotal: true },
      })
      return grupos.map((grupo) => ({
        nombre: grupo.nombre,
        unidades: grupo._sum.cantidad ?? 0,
        ingresos: grupo._sum.subtotal ?? 0,
      }))
    },

    // Pipeline operativo EN VIVO: cuántos pedidos hay en cada estado ahora
    // mismo (no acotado a un período). Alimenta el gráfico "Pedidos por estado".
    async contarPedidosPorEstado() {
      const grupos = await cliente.pedido.groupBy({ by: ['estado'], _count: true })
      return Object.fromEntries(grupos.map((grupo) => [grupo.estado, grupo._count]))
    },

    // Foto financiera EN VIVO: monto y cantidad de pagos por estado (cobrado vs
    // por cobrar). Alimenta el gráfico "Cobros".
    async sumarPagosPorEstado() {
      const grupos = await cliente.pago.groupBy({
        by: ['estado'],
        _sum: { monto: true },
        _count: true,
      })
      return Object.fromEntries(
        grupos.map((grupo) => [grupo.estado, { monto: grupo._sum.monto ?? 0, cantidad: grupo._count }]),
      )
    },

    // Pagos aprobados en una ventana, crudos (fecha + monto). El agrupado por
    // día lo hace el servicio en JS: la ventana es acotada (p. ej. 14 días) y así
    // el bucketing usa la misma zona horaria local que el resto de los rangos,
    // sin depender de la TZ de sesión de la base.
    async pagosAprobadosEntre({ desde, hasta }) {
      return cliente.pago.findMany({
        where: { estado: 'APROBADO', createdAt: { gte: desde, lt: hasta } },
        select: { createdAt: true, monto: true },
      })
    },

    // Productos publicados cuyo disponible (stock - reservado) cayó al umbral o
    // por debajo. El umbral es por producto (alerta_stock_bajo) y, si no tiene,
    // uno global. Va en SQL crudo porque compara dos columnas entre sí, algo
    // que el where tipado de Prisma no expresa.
    async contarStockCritico(umbralDefecto = 3) {
      const filas = await cliente.$queryRaw`
        SELECT count(*)::int AS total
        FROM productos
        WHERE estado = 'PUBLICADO'
          AND stock - stock_reservado <= COALESCE(alerta_stock_bajo, ${umbralDefecto})
      `
      return filas[0]?.total ?? 0
    },
  }
}

export const repositorioResumen = crearRepositorioResumen()
