import { Router } from 'express'
import { servicioFavoritos, ErrorFavorito } from './favoritos.service.js'
import { requerirCliente } from '../cuenta/cuenta.middleware.js'

// Lista de deseos del cliente. Protegida por sesión y SIEMPRE acotada a
// request.cliente.id: el clienteId sale de la cookie, jamás del cuerpo/URL.
export function crearRouterFavoritos(
  servicio = servicioFavoritos,
  { middlewareCliente = requerirCliente } = {},
) {
  const router = Router()
  router.use(middlewareCliente)

  // Tarjetas completas + ids, para la página "Favoritos".
  router.get('/', async (request, response, next) => {
    try {
      return response.json(await servicio.listar(request.cliente.id))
    } catch (error) {
      return next(error)
    }
  })

  // Solo ids: barato, para hidratar el estado de los corazones al cargar.
  router.get('/ids', async (request, response, next) => {
    try {
      const ids = await servicio.listarIds(request.cliente.id)
      return response.json({ data: ids })
    } catch (error) {
      return next(error)
    }
  })

  // Marcar como favorito (idempotente). 204 sin cuerpo.
  router.put('/:productoId', async (request, response, next) => {
    try {
      await servicio.agregar(request.cliente.id, request.params.productoId)
      return response.status(204).end()
    } catch (error) {
      if (error instanceof ErrorFavorito) {
        return response.status(404).json({ error: { code: error.code, message: error.message } })
      }
      return next(error)
    }
  })

  // Quitar de favoritos (idempotente). 204 sin cuerpo.
  router.delete('/:productoId', async (request, response, next) => {
    try {
      await servicio.quitar(request.cliente.id, request.params.productoId)
      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  return router
}

export default crearRouterFavoritos()
