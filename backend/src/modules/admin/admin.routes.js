import { Router } from 'express'
import { requerirSesion, requerirRoles } from '../auth/auth.middleware.js'
import {
  ErrorProductoAdmin,
  actualizarProducto,
  crearProducto,
  obtenerProductoParaEdicion,
  reemplazarImagenesProducto,
} from './admin-productos.service.js'
import {
  validarCambiosProductoAdmin,
  validarProductoNuevoAdmin,
} from './admin-productos.validacion.js'
import { validarImagenesProductoAdmin } from './admin-imagenes.validacion.js'
import { ErrorImagen, subirImagenProducto } from '../imagenes/imagenes.service.js'
import { recibirImagenProducto } from '../imagenes/imagenes.middleware.js'

export function crearRouterAdmin({
  servicio = {
    obtenerProductoParaEdicion,
    actualizarProducto,
    crearProducto,
    reemplazarImagenesProducto,
    subirImagenProducto,
  },
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

  adminRouter.post(
    '/productos',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarProductoNuevoAdmin(request.body)
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
        const producto = await servicio.crearProducto(validacion.data)
        return response.status(201).json({ data: producto })
      } catch (error) {
        if (error instanceof ErrorProductoAdmin) {
          return response.status(422).json({
            error: { code: error.code, message: error.message },
          })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: {
              code: 'PRODUCT_ALREADY_EXISTS',
              message: 'El SKU, slug o código de barras ya está en uso.',
            },
          })
        }
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

  adminRouter.put(
    '/productos/:id/imagenes',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarImagenesProductoAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_PRODUCT_IMAGES',
            message: 'Revisa las imágenes del producto.',
          },
        })
      }

      try {
        const producto = await servicio.reemplazarImagenesProducto(
          request.params.id,
          validacion.data.imagenes,
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
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/imagenes',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    recibirImagenProducto,
    async (request, response, next) => {
      try {
        const imagen = await servicio.subirImagenProducto(request.file)
        return response.status(201).json({ data: imagen })
      } catch (error) {
        if (error instanceof ErrorImagen) {
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
