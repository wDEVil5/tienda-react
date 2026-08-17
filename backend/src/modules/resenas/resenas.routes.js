import { Router } from 'express'
import { servicioResenas, ErrorResena } from './resenas.service.js'
import { validarResena } from './resenas.validacion.js'
import { requerirCliente, clienteOpcional } from '../cuenta/cuenta.middleware.js'

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Reseñas de productos. La lista es pública (sesión opcional para marcar "es
// mía"); crear/editar/borrar exige sesión de cliente. El clienteId sale SIEMPRE
// de la sesión, nunca del cuerpo ni la URL.
export function crearRouterResenas(
  servicio = servicioResenas,
  { middlewareCliente = requerirCliente, middlewareOpcional = clienteOpcional } = {},
) {
  const router = Router()

  // Lista pública paginada + agregado (promedio, conteo). Sesión opcional.
  router.get('/', middlewareOpcional, async (request, response, next) => {
    const productoId = typeof request.query.productoId === 'string' ? request.query.productoId : ''
    if (!ES_UUID.test(productoId)) {
      return response.status(400).json({
        error: { code: 'INVALID_QUERY_PARAM', message: 'productoId inválido.' },
      })
    }
    const page = Number(request.query.page) || 1
    const limit = Math.min(Number(request.query.limit) || 10, 50)
    const orden = typeof request.query.orden === 'string' ? request.query.orden : 'reciente'

    try {
      const resultado = await servicio.listar({
        productoId,
        page,
        limit,
        orden,
        clienteId: request.cliente?.id ?? null,
      })
      return response.json(resultado)
    } catch (error) {
      return next(error)
    }
  })

  // Elegibilidad (¿compró?) + su reseña, para el formulario. Requiere sesión.
  router.get('/mia', middlewareCliente, async (request, response, next) => {
    const productoId = typeof request.query.productoId === 'string' ? request.query.productoId : ''
    if (!ES_UUID.test(productoId)) {
      return response.status(400).json({
        error: { code: 'INVALID_QUERY_PARAM', message: 'productoId inválido.' },
      })
    }
    try {
      const estado = await servicio.estadoParaCliente({ productoId, clienteId: request.cliente.id })
      return response.json({ data: estado })
    } catch (error) {
      return next(error)
    }
  })

  // Crear o editar la reseña del cliente (upsert). Requiere sesión + compra.
  router.post('/', middlewareCliente, async (request, response, next) => {
    const validacion = validarResena(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_REVIEW_DATA',
          message: 'Revisa tu reseña.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      const resena = await servicio.guardar({ ...validacion.data, clienteId: request.cliente.id })
      return response.status(201).json({ data: resena })
    } catch (error) {
      if (error instanceof ErrorResena) {
        return response.status(403).json({ error: { code: error.code, message: error.message } })
      }
      return next(error)
    }
  })

  // Borrar la reseña propia.
  router.delete('/:id', middlewareCliente, async (request, response, next) => {
    if (!ES_UUID.test(request.params.id)) {
      return response.status(404).json({
        error: { code: 'REVIEW_NOT_FOUND', message: 'No encontramos esa reseña.' },
      })
    }
    try {
      const resultado = await servicio.eliminarPropia({ id: request.params.id, clienteId: request.cliente.id })
      if (!resultado.eliminada) {
        return response.status(404).json({
          error: { code: 'REVIEW_NOT_FOUND', message: 'No encontramos esa reseña.' },
        })
      }
      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  return router
}

export default crearRouterResenas()
