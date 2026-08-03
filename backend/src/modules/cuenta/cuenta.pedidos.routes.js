import { Router } from 'express'
import {
  listarPedidosDeCliente,
  obtenerPedidoDeCliente,
} from '../pedidos/pedidos.service.js'
import { ESTADOS_PEDIDO } from '../pedidos/pedidos.estados.js'
import { requerirCliente } from './cuenta.middleware.js'

// Historial de pedidos del cliente. Protegido por sesión y SIEMPRE acotado a
// request.cliente.id: nadie ve pedidos ajenos ni pasando un id directo.
export function crearRouterPedidosCliente(
  servicio = { listarPedidosDeCliente, obtenerPedidoDeCliente },
  { middlewareCliente = requerirCliente } = {},
) {
  const router = Router()
  router.use(middlewareCliente)

  router.get('/', async (request, response, next) => {
    const { estado } = request.query
    if (estado !== undefined && !ESTADOS_PEDIDO.includes(estado)) {
      return response.status(400).json({
        error: { code: 'INVALID_QUERY_PARAM', message: 'Estado de pedido no válido.' },
      })
    }

    const page = Number(request.query.page) || 1
    const limit = Math.min(Number(request.query.limit) || 20, 50)

    try {
      const resultado = await servicio.listarPedidosDeCliente(request.cliente.id, {
        page,
        limit,
        estado,
      })
      return response.json(resultado)
    } catch (error) {
      return next(error)
    }
  })

  router.get('/:id', async (request, response, next) => {
    try {
      const pedido = await servicio.obtenerPedidoDeCliente(
        request.cliente.id,
        request.params.id,
      )
      if (!pedido) {
        return response.status(404).json({
          error: { code: 'ORDER_NOT_FOUND', message: 'No encontramos ese pedido.' },
        })
      }
      return response.json({ data: pedido })
    } catch (error) {
      return next(error)
    }
  })

  return router
}

export default crearRouterPedidosCliente()
