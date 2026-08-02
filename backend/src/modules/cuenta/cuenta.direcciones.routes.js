import { Router } from 'express'
import {
  actualizarDireccion,
  crearDireccion,
  eliminarDireccion,
  listarDirecciones,
} from './cuenta.direcciones.service.js'
import { requerirCliente } from './cuenta.middleware.js'
import { validarDireccionCliente } from './cuenta.direcciones.validacion.js'

// Todas las rutas viven bajo una sesión de cliente y quedan acotadas a SU
// clienteId (request.cliente.id): nunca se acepta un clienteId del cuerpo.
export function crearRouterDirecciones(
  servicio = { listarDirecciones, crearDireccion, actualizarDireccion, eliminarDireccion },
  { middlewareCliente = requerirCliente } = {},
) {
  const router = Router()
  router.use(middlewareCliente)

  router.get('/', async (request, response, next) => {
    try {
      return response.json({ data: await servicio.listarDirecciones(request.cliente.id) })
    } catch (error) {
      return next(error)
    }
  })

  router.post('/', async (request, response, next) => {
    const validacion = validarDireccionCliente(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_ADDRESS_DATA',
          message: 'Revisa los datos de la dirección.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      const direccion = await servicio.crearDireccion(request.cliente.id, validacion.data)
      return response.status(201).json({ data: direccion })
    } catch (error) {
      return next(error)
    }
  })

  router.patch('/:id', async (request, response, next) => {
    const validacion = validarDireccionCliente(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_ADDRESS_DATA',
          message: 'Revisa los datos de la dirección.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      const direccion = await servicio.actualizarDireccion(
        request.cliente.id,
        request.params.id,
        validacion.data,
      )
      if (!direccion) {
        return response.status(404).json({
          error: { code: 'ADDRESS_NOT_FOUND', message: 'No encontramos esa dirección.' },
        })
      }
      return response.json({ data: direccion })
    } catch (error) {
      return next(error)
    }
  })

  router.delete('/:id', async (request, response, next) => {
    try {
      const eliminada = await servicio.eliminarDireccion(request.cliente.id, request.params.id)
      if (!eliminada) {
        return response.status(404).json({
          error: { code: 'ADDRESS_NOT_FOUND', message: 'No encontramos esa dirección.' },
        })
      }
      return response.status(204).end()
    } catch (error) {
      return next(error)
    }
  })

  return router
}

export default crearRouterDirecciones()
