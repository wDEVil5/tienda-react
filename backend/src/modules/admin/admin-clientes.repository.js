import { prisma } from '../../lib/prisma.js'

// WHERE compartido por listar/contar: búsqueda parcial por nombre O email, sin
// distinguir mayúsculas. Sin texto, no restringe (lista completa).
function crearWhereClientes(query) {
  const texto = typeof query === 'string' ? query.trim() : ''
  if (!texto) return {}
  return {
    OR: [
      { nombre: { contains: texto, mode: 'insensitive' } },
      { email: { contains: texto, mode: 'insensitive' } },
    ],
  }
}

/**
 * Consultas de la sección Clientes del panel. Aísla Prisma como el resto de los
 * repositorios, para poder inyectar un cliente de prueba o de transacción.
 */
export function crearRepositorioClientesAdmin(cliente = prisma) {
  return {
    // Página de clientes (los más nuevos primero). El id de desempate mantiene el
    // orden estable entre páginas cuando dos comparten createdAt.
    listar({ page = 1, limit = 20, query = '' } = {}) {
      return cliente.cliente.findMany({
        where: crearWhereClientes(query),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          activo: true,
          createdAt: true,
        },
      })
    },

    contar({ query = '' } = {}) {
      return cliente.cliente.count({ where: crearWhereClientes(query) })
    },

    // Métricas de compra de VARIOS clientes de una vez (para la lista): total
    // gastado, nº de pedidos pagados y fecha del último. Solo cuenta pedidos con
    // un pago APROBADO, para ser coherente con "ventas" del tablero de Resumen.
    // Un groupBy en vez de N consultas: la lista trae a lo sumo `limit` ids.
    metricasCompra(ids) {
      return cliente.pedido.groupBy({
        by: ['clienteId'],
        where: { clienteId: { in: ids }, pagos: { some: { estado: 'APROBADO' } } },
        _sum: { total: true },
        _count: true,
        _max: { createdAt: true },
      })
    },

    // Ficha de un cliente: sus datos + direcciones guardadas (la predeterminada
    // primero). No trae el hash de contraseña ni el googleId completo: el panel
    // solo necesita saber si la cuenta está enlazada a Google, no el identificador.
    obtenerPorId(id) {
      return cliente.cliente.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          activo: true,
          googleId: true,
          createdAt: true,
          updatedAt: true,
          direcciones: {
            orderBy: [{ predeterminada: 'desc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              etiqueta: true,
              calle: true,
              depto: true,
              comuna: true,
              region: true,
              instrucciones: true,
              predeterminada: true,
            },
          },
        },
      })
    },

    // Métricas de compra de UN cliente (para la ficha). Misma definición que la
    // versión por lotes: pedidos con pago aprobado.
    async metricasDe(clienteId) {
      const { _sum, _count, _max } = await cliente.pedido.aggregate({
        where: { clienteId, pagos: { some: { estado: 'APROBADO' } } },
        _sum: { total: true },
        _count: true,
        _max: { createdAt: true },
      })
      return {
        totalGastado: _sum.total ?? 0,
        pedidos: _count,
        ultimaCompra: _max.createdAt ?? null,
      }
    },

    // Existencia + estado actual de un cliente (select mínimo). Lo usa el servicio
    // antes de activar/desactivar para devolver 404 limpio si no existe.
    obtenerEstado(id) {
      return cliente.cliente.findUnique({
        where: { id },
        select: { id: true, activo: true },
      })
    },

    // Cambia el flag `activo`. Al DESACTIVAR, revoca en la misma transacción las
    // sesiones vivas del cliente: si lo bloqueamos, no debe seguir navegando con
    // una sesión ya abierta. Al reactivar no se toca ninguna sesión (ya no hay).
    cambiarActivo(id, activo, ahora) {
      return cliente.$transaction(async (transaccion) => {
        const actualizado = await transaccion.cliente.update({
          where: { id },
          data: { activo },
          select: { id: true, nombre: true, email: true, activo: true },
        })
        if (!activo) {
          await transaccion.sesionCliente.updateMany({
            where: { clienteId: id, revocadaEn: null },
            data: { revocadaEn: ahora },
          })
        }
        return actualizado
      })
    },

    // Últimos pedidos del cliente para el historial de la ficha (todos, no solo
    // los pagados: aquí sí interesa ver un pedido pendiente o cancelado). `pagos`
    // se acota a uno aprobado solo para marcar el chip "Pagado".
    pedidosDe(clienteId, limite = 10) {
      return cliente.pedido.findMany({
        where: { clienteId },
        orderBy: { createdAt: 'desc' },
        take: limite,
        select: {
          id: true,
          numero: true,
          estado: true,
          modalidad: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
          pagos: { where: { estado: 'APROBADO' }, select: { id: true }, take: 1 },
        },
      })
    },
  }
}

export const repositorioClientesAdmin = crearRepositorioClientesAdmin()
