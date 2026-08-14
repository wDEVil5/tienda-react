import { repositorioClientesAdmin } from './admin-clientes.repository.js'

export function crearServicioClientesAdmin(repositorio = repositorioClientesAdmin) {
  return {
    // Lista paginada con métricas de compra por cliente. La lista de clientes y su
    // total se piden en paralelo; luego, una sola consulta de métricas para todos
    // los ids de la página, que se cruza en memoria (Map por clienteId).
    async listarClientes({ page = 1, limit = 20, query = '' } = {}) {
      const termino = typeof query === 'string' ? query.trim() : ''
      const [clientes, total] = await Promise.all([
        repositorio.listar({ page, limit, query: termino }),
        repositorio.contar({ query: termino }),
      ])

      const metricas = clientes.length
        ? await repositorio.metricasCompra(clientes.map((cliente) => cliente.id))
        : []
      const porId = new Map(metricas.map((grupo) => [grupo.clienteId, grupo]))

      const data = clientes.map((cliente) => {
        const grupo = porId.get(cliente.id)
        return {
          id: cliente.id,
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono,
          activo: cliente.activo,
          createdAt: cliente.createdAt,
          pedidos: grupo?._count ?? 0,
          totalGastado: grupo?._sum.total ?? 0,
          ultimaCompra: grupo?._max.createdAt ?? null,
        }
      })

      return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    },

    // Ficha completa: datos del cliente, sus direcciones, métricas de compra e
    // historial de pedidos recientes. Devuelve null si no existe (→ 404 en la ruta).
    async obtenerCliente(id) {
      const cliente = await repositorio.obtenerPorId(id)
      if (!cliente) return null

      const [metricas, pedidos] = await Promise.all([
        repositorio.metricasDe(id),
        repositorio.pedidosDe(id),
      ])

      const { googleId, ...datos } = cliente
      return {
        ...datos,
        // Solo exponemos si la cuenta está enlazada a Google, no el identificador.
        conGoogle: Boolean(googleId),
        metricas,
        pedidos: pedidos.map((pedido) => ({
          id: pedido.id,
          numero: pedido.numero,
          estado: pedido.estado,
          modalidad: pedido.modalidad,
          total: pedido.total,
          createdAt: pedido.createdAt,
          items: pedido._count.items,
          pagado: pedido.pagos.length > 0,
        })),
      }
    },
  }
}

const servicioClientesAdmin = crearServicioClientesAdmin()

export const listarClientesAdmin = servicioClientesAdmin.listarClientes
export const obtenerClienteAdmin = servicioClientesAdmin.obtenerCliente
