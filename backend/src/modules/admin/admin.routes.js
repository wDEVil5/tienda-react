import { Router } from 'express'
import { requerirSesion, requerirRoles } from '../auth/auth.middleware.js'
import {
  ErrorProductoAdmin,
  actualizarProducto,
  crearProducto,
  desactivarProducto,
  listarProductosAdmin,
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
import { listarOpcionesProductoAdmin } from './admin-referencias.service.js'
import {
  ErrorPromocionAdmin,
  activarPromocionAdmin,
  actualizarPromocionAdmin,
  crearPromocionAdmin,
  desactivarPromocionAdmin,
  listarPromocionesAdmin,
  obtenerPromocionParaEdicionAdmin,
} from './admin-promociones.service.js'
import {
  validarCambiosPromocionAdmin,
  validarPromocionNuevaAdmin,
} from './admin-promociones.validacion.js'
import {
  ErrorCategoriaAdmin,
  activarCategoriaAdmin,
  crearCategoriaAdmin,
  desactivarCategoriaAdmin,
  listarCategoriasAdmin,
} from './admin-categorias.service.js'
import { validarCategoriaNuevaAdmin } from './admin-categorias.validacion.js'
import { ErrorMarcaAdmin, crearMarcaAdmin, listarMarcasAdmin } from './admin-marcas.service.js'
import { validarMarcaNuevaAdmin } from './admin-marcas.validacion.js'
import { asignarLogoMarcaAdmin } from './admin-marcas.service.js'
import { recibirLogoMarca } from '../imagenes/imagenes.middleware.js'
import { subirLogoMarca } from '../imagenes/imagenes.service.js'
import { eliminarLogoMarca } from '../imagenes/imagenes.storage.js'
import { ErrorEtiquetaAdmin, crearEtiquetaAdmin, listarEtiquetasAdmin } from './admin-etiquetas.service.js'
import { validarEtiquetaNuevaAdmin } from './admin-etiquetas.validacion.js'
import {
  ErrorUsuarioAdmin,
  activarUsuarioAdmin,
  crearOperadorAdmin,
  desactivarUsuarioAdmin,
  listarUsuariosAdmin,
  restablecerContrasenaUsuarioAdmin,
} from './admin-usuarios.service.js'
import {
  validarContrasenaUsuarioAdmin,
  validarUsuarioNuevoAdmin,
} from './admin-usuarios.validacion.js'
import {
  ErrorPedido,
  cambiarEstadoPedido,
  listarPedidos,
  obtenerDetallePedido,
} from '../pedidos/pedidos.service.js'
import { validarCambioEstadoPedido } from '../pedidos/pedidos.validacion.js'
import { ESTADOS_PEDIDO } from '../pedidos/pedidos.estados.js'
import { actualizarReglas, obtenerReglas } from '../reglas/reglas.service.js'
import { validarReglas } from '../reglas/reglas.validacion.js'

export function crearRouterAdmin({
  servicio = {
    obtenerProductoParaEdicion,
    listarProductosAdmin,
    actualizarProducto,
    crearProducto,
    desactivarProducto,
    reemplazarImagenesProducto,
    subirImagenProducto,
    listarOpcionesProductoAdmin,
    listarPromocionesAdmin,
    crearPromocionAdmin,
    activarPromocionAdmin,
    actualizarPromocionAdmin,
    crearCategoriaAdmin,
    listarCategoriasAdmin,
    desactivarCategoriaAdmin,
    activarCategoriaAdmin,
    crearMarcaAdmin,
    listarMarcasAdmin,
    asignarLogoMarcaAdmin,
    subirLogoMarca,
    crearEtiquetaAdmin,
    listarEtiquetasAdmin,
    crearOperadorAdmin,
    listarUsuariosAdmin,
    desactivarUsuarioAdmin,
    activarUsuarioAdmin,
    restablecerContrasenaUsuarioAdmin,
    desactivarPromocionAdmin,
    obtenerPromocionParaEdicionAdmin,
    listarPedidos,
    obtenerDetallePedido,
    cambiarEstadoPedido,
    obtenerReglas,
    actualizarReglas,
  },
  middlewareSesion = requerirSesion,
} = {}) {
  const adminRouter = Router()

  adminRouter.post(
    '/usuarios',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarUsuarioNuevoAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_USER_DATA', message: 'Revisa los datos del usuario.' },
        })
      }

      try {
        const usuario = await servicio.crearOperadorAdmin(validacion.data)
        return response.status(201).json({ data: usuario })
      } catch (error) {
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'USER_ALREADY_EXISTS', message: 'Ya existe un usuario con ese email.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/usuarios',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (_request, response, next) => {
      try {
        return response.json(await servicio.listarUsuariosAdmin())
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/usuarios/:id/desactivar',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const usuario = await servicio.desactivarUsuarioAdmin(request.params.id, request.usuario.id)
        if (!usuario) {
          return response.status(404).json({
            error: { code: 'ADMIN_USER_NOT_FOUND', message: 'No encontramos el usuario solicitado.' },
          })
        }
        return response.json({ data: usuario })
      } catch (error) {
        if (error instanceof ErrorUsuarioAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/usuarios/:id/activar',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const usuario = await servicio.activarUsuarioAdmin(request.params.id)
        if (!usuario) {
          return response.status(404).json({
            error: { code: 'ADMIN_USER_NOT_FOUND', message: 'No encontramos el usuario solicitado.' },
          })
        }
        return response.json({ data: usuario })
      } catch (error) {
        if (error instanceof ErrorUsuarioAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/usuarios/:id/contrasena',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarContrasenaUsuarioAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_PASSWORD_DATA', message: 'Revisa la nueva contraseña.' },
        })
      }

      try {
        const usuario = await servicio.restablecerContrasenaUsuarioAdmin(
          request.params.id,
          validacion.data.contrasena,
        )
        if (!usuario) {
          return response.status(404).json({
            error: { code: 'ADMIN_USER_NOT_FOUND', message: 'No encontramos el usuario solicitado.' },
          })
        }
        return response.json({ data: usuario })
      } catch (error) {
        if (error instanceof ErrorUsuarioAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/categorias',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (_request, response, next) => {
      try {
        return response.json(await servicio.listarCategoriasAdmin())
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/categorias',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarCategoriaNuevaAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_CATEGORY_DATA', message: 'Revisa los datos de la categoría.' },
        })
      }

      try {
        const categoria = await servicio.crearCategoriaAdmin(validacion.data)
        return response.status(201).json({ data: categoria })
      } catch (error) {
        if (error instanceof ErrorCategoriaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'CATEGORY_ALREADY_EXISTS', message: 'El nombre o slug de la categoría ya está en uso.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/categorias/:id/desactivar',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const categoria = await servicio.desactivarCategoriaAdmin(request.params.id)
        if (!categoria) {
          return response.status(404).json({
            error: { code: 'ADMIN_CATEGORY_NOT_FOUND', message: 'No encontramos la categoría solicitada.' },
          })
        }
        return response.json({ data: categoria })
      } catch (error) {
        if (error instanceof ErrorCategoriaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/categorias/:id/activar',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const categoria = await servicio.activarCategoriaAdmin(request.params.id)
        if (!categoria) {
          return response.status(404).json({
            error: { code: 'ADMIN_CATEGORY_NOT_FOUND', message: 'No encontramos la categoría solicitada.' },
          })
        }
        return response.json({ data: categoria })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/marcas',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarMarcaNuevaAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_BRAND_DATA', message: 'Revisa los datos de la marca.' },
        })
      }

      try {
        const marca = await servicio.crearMarcaAdmin(validacion.data)
        return response.status(201).json({ data: marca })
      } catch (error) {
        if (error instanceof ErrorMarcaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'BRAND_ALREADY_EXISTS', message: 'El nombre o slug de la marca ya está en uso.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/marcas',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (_request, response, next) => {
      try {
        return response.json(await servicio.listarMarcasAdmin())
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/marcas/:id/logo',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    recibirLogoMarca,
    async (request, response, next) => {
      try {
        const logo = await servicio.subirLogoMarca(request.file)
        const marca = await servicio.asignarLogoMarcaAdmin(request.params.id, logo)
        if (!marca) {
          // El archivo ya llegó a Cloudinary: lo eliminamos si la marca no existe.
          await eliminarLogoMarca(logo.storageKey).catch(() => {})
          return response.status(404).json({
            error: { code: 'ADMIN_BRAND_NOT_FOUND', message: 'No encontramos la marca solicitada.' },
          })
        }
        return response.json({ data: marca })
      } catch (error) {
        if (error instanceof ErrorImagen) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/etiquetas',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarEtiquetaNuevaAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_TAG_DATA', message: 'Revisa los datos de la etiqueta.' },
        })
      }

      try {
        const etiqueta = await servicio.crearEtiquetaAdmin(validacion.data)
        return response.status(201).json({ data: etiqueta })
      } catch (error) {
        if (error instanceof ErrorEtiquetaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'TAG_ALREADY_EXISTS', message: 'El nombre o slug de la etiqueta ya está en uso.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/etiquetas',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (_request, response, next) => {
      try {
        return response.json(await servicio.listarEtiquetasAdmin())
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/promociones',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (_request, response, next) => {
      try {
        return response.json(await servicio.listarPromocionesAdmin())
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/promociones/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const promocion = await servicio.obtenerPromocionParaEdicionAdmin(request.params.id)
        if (!promocion) {
          return response.status(404).json({
            error: { code: 'ADMIN_PROMOTION_NOT_FOUND', message: 'No encontramos la promoción solicitada.' },
          })
        }
        return response.json({ data: promocion })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/promociones',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarPromocionNuevaAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_PROMOTION_DATA',
            message: 'Revisa los datos de la promoción.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const promocion = await servicio.crearPromocionAdmin(validacion.data)
        return response.status(201).json({ data: promocion })
      } catch (error) {
        if (error instanceof ErrorPromocionAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'PROMOTION_ALREADY_EXISTS', message: 'El slug de la promoción ya está en uso.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/promociones/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarCambiosPromocionAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_PROMOTION_DATA',
            message: 'Revisa los datos de la promoción.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const promocion = await servicio.actualizarPromocionAdmin(request.params.id, validacion.data)
        if (!promocion) {
          return response.status(404).json({
            error: { code: 'ADMIN_PROMOTION_NOT_FOUND', message: 'No encontramos la promoción solicitada.' },
          })
        }
        return response.json({ data: promocion })
      } catch (error) {
        if (error instanceof ErrorPromocionAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'PROMOTION_ALREADY_EXISTS', message: 'El slug de la promoción ya está en uso.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/promociones/:id/activar',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const promocion = await servicio.activarPromocionAdmin(request.params.id)
        if (!promocion) {
          return response.status(404).json({
            error: { code: 'ADMIN_PROMOTION_NOT_FOUND', message: 'No encontramos la promoción solicitada.' },
          })
        }
        return response.json({ data: promocion })
      } catch (error) {
        if (error instanceof ErrorPromocionAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/promociones/:id/desactivar',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const promocion = await servicio.desactivarPromocionAdmin(request.params.id)
        if (!promocion) {
          return response.status(404).json({
            error: { code: 'ADMIN_PROMOTION_NOT_FOUND', message: 'No encontramos la promoción solicitada.' },
          })
        }
        return response.json({ data: promocion })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/referencias/producto',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (_request, response, next) => {
      try {
        return response.json(await servicio.listarOpcionesProductoAdmin())
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/productos',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const page = leerEnteroPositivo(request.query.page, 1)
      const limit = leerEnteroPositivo(request.query.limit, 20, 100)
      const estado = typeof request.query.estado === 'string' ? request.query.estado : undefined
      const query = typeof request.query.q === 'string' ? request.query.q : ''

      if (
        page === null ||
        limit === null ||
        (estado !== undefined && !['BORRADOR', 'PUBLICADO', 'ARCHIVADO'].includes(estado))
      ) {
        return response.status(400).json({
          error: {
            code: 'INVALID_QUERY_PARAM',
            message: 'page debe ser positivo, limit debe estar entre 1 y 100 y estado debe ser válido.',
          },
        })
      }

      try {
        return response.json(await servicio.listarProductosAdmin({ page, limit, query, estado }))
      } catch (error) {
        return next(error)
      }
    },
  )

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

  adminRouter.delete(
    '/productos/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const fueDesactivado = await servicio.desactivarProducto(request.params.id)

        if (!fueDesactivado) {
          return response.status(404).json({
            error: {
              code: 'ADMIN_PRODUCT_NOT_FOUND',
              message: 'No encontramos el producto solicitado.',
            },
          })
        }

        return response.status(204).end()
      } catch (error) {
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

  adminRouter.get(
    '/pedidos',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const page = leerEnteroPositivo(request.query.page, 1)
      const limit = leerEnteroPositivo(request.query.limit, 20, 100)
      const estado = typeof request.query.estado === 'string' ? request.query.estado : undefined

      if (
        page === null ||
        limit === null ||
        (estado !== undefined && !ESTADOS_PEDIDO.includes(estado))
      ) {
        return response.status(400).json({
          error: {
            code: 'INVALID_QUERY_PARAM',
            message: 'page debe ser positivo, limit entre 1 y 100 y estado debe ser válido.',
          },
        })
      }

      try {
        return response.json(await servicio.listarPedidos({ page, limit, estado }))
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/pedidos/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const pedido = await servicio.obtenerDetallePedido(request.params.id)
        if (!pedido) {
          return response.status(404).json({
            error: { code: 'ADMIN_ORDER_NOT_FOUND', message: 'No encontramos el pedido solicitado.' },
          })
        }
        return response.json({ data: pedido })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/pedidos/:id/estado',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarCambioEstadoPedido(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_ORDER_STATE', message: 'Revisa el estado enviado.' },
        })
      }

      try {
        const pedido = await servicio.cambiarEstadoPedido(
          request.params.id,
          validacion.data.estado,
          validacion.data.nota,
        )
        if (!pedido) {
          return response.status(404).json({
            error: { code: 'ADMIN_ORDER_NOT_FOUND', message: 'No encontramos el pedido solicitado.' },
          })
        }
        return response.json({ data: pedido })
      } catch (error) {
        // Transición no permitida por la máquina de estados.
        if (error instanceof ErrorPedido) {
          return response.status(409).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  // Reglas de la tienda (envío, tarifas por comuna, retiro). Solo ADMIN: es
  // configuración del negocio, no una tarea operativa del día a día.
  adminRouter.get(
    '/reglas',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (_request, response, next) => {
      try {
        return response.json({ data: await servicio.obtenerReglas() })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.put(
    '/reglas',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarReglas(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_STORE_RULES',
            message: 'Revisa las reglas de la tienda.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const reglas = await servicio.actualizarReglas(validacion.data)
        return response.json({ data: reglas })
      } catch (error) {
        return next(error)
      }
    },
  )

  return adminRouter
}

function leerEnteroPositivo(valor, predeterminado, maximo = Infinity) {
  if (valor === undefined) return predeterminado
  const numero = typeof valor === 'string' ? Number(valor) : Number.NaN
  return Number.isInteger(numero) && numero > 0 && numero <= maximo ? numero : null
}

export default crearRouterAdmin()
