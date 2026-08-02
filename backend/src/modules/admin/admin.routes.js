import { Router } from 'express'
import { requerirSesion, requerirRoles } from '../auth/auth.middleware.js'
import {
  ErrorProductoAdmin,
  actualizarProducto,
  obtenerProductoParaEdicion,
} from './admin-productos.service.js'
import { validarCambiosProductoAdmin } from './admin-productos.validacion.js'

export function crearRouterAdmin({
  servicio = { obtenerProductoParaEdicion, actualizarProducto },
  middlewareSesion = requerirSesion,
} = {}) {
  const adminRouter = Router()

  // Operador podrá gestionar catálogo; las acciones exclusivas de ADMIN se
  // decidirán ruta por ruta cuando se agreguen usuarios y promociones.
  adminRouter.get(
    '/productos/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const producto = await servicio.obtenerProductoParaEdicion(request.params.id)

        if (!producto) {
          return response.status(404).json({
            error: {
              code: 'ADMIN_PRODUCT_NOT_FOUND',
              message: 'No encontramos el producto solicitado.',
            },
          })
        }

        return response.json({ data: producto })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/productos/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarCambiosProductoAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_PRODUCT_DATA',
            message: 'Revisa los campos del producto.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const producto = await servicio.actualizarProducto(
          request.params.id,
          validacion.data,
        )

        if (!producto) {
          return response.status(404).json({
            error: {
              code: 'ADMIN_PRODUCT_NOT_FOUND',
              message: 'No encontramos el producto solicitado.',
            },
          })
        }

        return response.json({ data: producto })
      } catch (error) {
        if (error instanceof ErrorProductoAdmin) {
          return response.status(422).json({
            error: { code: error.code, message: error.message },
          })
        }
        return next(error)
      }
    },
  )

  return adminRouter
}

export default crearRouterAdmin()
