import { Router } from 'express'
import { requerirSesion, requerirRoles } from '../auth/auth.middleware.js'
import {
  ErrorProductoAdmin,
  actualizarProducto,
  crearProducto,
  desactivarProducto,
  eliminarProducto,
  listarProductosAdmin,
  obtenerProductoParaEdicion,
  reemplazarImagenesProducto,
  restaurarProducto,
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
import {
  ErrorSubcategoriaAdmin,
  actualizarSubcategoriaAdmin,
  crearSubcategoriaAdmin,
  eliminarSubcategoriaAdmin,
  listarSubcategoriasAdmin,
} from './admin-subcategorias.service.js'
import {
  validarSubcategoriaCambios,
  validarSubcategoriaNueva,
} from './admin-subcategorias.validacion.js'
import {
  ErrorSubcategoriaHijaAdmin,
  actualizarSubcategoriaHijaAdmin,
  crearSubcategoriaHijaAdmin,
  eliminarSubcategoriaHijaAdmin,
} from './admin-subcategorias-hijas.service.js'
import {
  validarSubcategoriaHijaCambios,
  validarSubcategoriaHijaNueva,
} from './admin-subcategorias-hijas.validacion.js'
import {
  ErrorAtributoAdmin,
  actualizarAtributoAdmin,
  actualizarOpcionAtributoAdmin,
  crearAtributoAdmin,
  crearOpcionAtributoAdmin,
  eliminarAtributoAdmin,
  eliminarOpcionAtributoAdmin,
  listarAtributosAdmin,
} from './admin-atributos.service.js'
import {
  validarAtributoCambios,
  validarAtributoNuevo,
  validarOpcionAtributoCambios,
  validarOpcionAtributoNueva,
} from './admin-atributos.validacion.js'
import {
  ErrorMarcaAdmin,
  actualizarDominioBrandfetchAdmin,
  crearMarcaAdmin,
  listarMarcasAdmin,
  eliminarMarcaAdmin,
} from './admin-marcas.service.js'
import { validarDominioBrandfetchAdmin, validarMarcaNuevaAdmin } from './admin-marcas.validacion.js'
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
  eliminarUsuarioAdmin,
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
import {
  PERIODOS_RESUMEN,
  obtenerMasVendidos,
  obtenerResumen,
  obtenerVentasDiarias,
} from './admin-resumen.service.js'
import { actualizarReglas, obtenerReglas } from '../reglas/reglas.service.js'
import { validarReglas } from '../reglas/reglas.validacion.js'
import {
  cambiarEstadoClienteAdmin,
  listarClientesAdmin,
  obtenerClienteAdmin,
} from './admin-clientes.service.js'
import {
  ErrorInventario,
  ajustarStockAdmin,
  listarInventarioAdmin,
  listarMovimientosAdmin,
} from './admin-inventario.service.js'
import { validarAjusteStock } from './admin-inventario.validacion.js'
import { actualizarIdentidad, obtenerIdentidad } from '../identidad/identidad.service.js'
import { validarIdentidad } from '../identidad/identidad.validacion.js'
import {
  guardarPaginaAdmin,
  listarPaginasAdmin,
  obtenerPaginaAdmin,
} from '../paginas/paginas.service.js'
import { validarPagina } from '../paginas/paginas.validacion.js'
import {
  actualizarBanner,
  crearBanner,
  eliminarBanner,
  listarBannersAdmin,
  obtenerBannerAdmin,
} from '../banners/banners.service.js'
import { validarBannerCambios, validarBannerNuevo } from '../banners/banners.validacion.js'
import { recibirImagenBanner } from '../imagenes/imagenes.middleware.js'
import { subirImagenBanner } from '../imagenes/imagenes.service.js'

export function crearRouterAdmin({
  servicio = {
    obtenerProductoParaEdicion,
    listarProductosAdmin,
    actualizarProducto,
    crearProducto,
    desactivarProducto,
    restaurarProducto,
    eliminarProducto,
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
    listarSubcategoriasAdmin,
    crearSubcategoriaAdmin,
    actualizarSubcategoriaAdmin,
    eliminarSubcategoriaAdmin,
    listarAtributosAdmin,
    crearAtributoAdmin,
    actualizarAtributoAdmin,
    eliminarAtributoAdmin,
    crearOpcionAtributoAdmin,
    actualizarOpcionAtributoAdmin,
    eliminarOpcionAtributoAdmin,
    crearMarcaAdmin,
    listarMarcasAdmin,
    eliminarMarcaAdmin,
    actualizarDominioBrandfetchAdmin,
    asignarLogoMarcaAdmin,
    subirLogoMarca,
    crearEtiquetaAdmin,
    listarEtiquetasAdmin,
    crearOperadorAdmin,
    listarUsuariosAdmin,
    desactivarUsuarioAdmin,
    activarUsuarioAdmin,
    restablecerContrasenaUsuarioAdmin,
    eliminarUsuarioAdmin,
    desactivarPromocionAdmin,
    obtenerPromocionParaEdicionAdmin,
    listarPedidos,
    obtenerDetallePedido,
    cambiarEstadoPedido,
    obtenerResumen,
    obtenerVentasDiarias,
    obtenerMasVendidos,
    obtenerReglas,
    actualizarReglas,
    listarClientesAdmin,
    obtenerClienteAdmin,
    cambiarEstadoClienteAdmin,
    listarInventarioAdmin,
    ajustarStockAdmin,
    listarMovimientosAdmin,
    obtenerIdentidad,
    actualizarIdentidad,
    listarPaginasAdmin,
    obtenerPaginaAdmin,
    guardarPaginaAdmin,
    listarBannersAdmin,
    obtenerBannerAdmin,
    crearBanner,
    actualizarBanner,
    eliminarBanner,
    subirImagenBanner,
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

  adminRouter.delete(
    '/usuarios/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        // El id de quien pide sale de la sesión: la guarda "no a ti mismo" es real.
        const usuario = await servicio.eliminarUsuarioAdmin(request.params.id, request.usuario.id)
        if (!usuario) {
          return response.status(404).json({
            error: { code: 'ADMIN_USER_NOT_FOUND', message: 'No encontramos el usuario solicitado.' },
          })
        }
        return response.status(204).end()
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

  adminRouter.patch(
    '/marcas/:id/brandfetch',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarDominioBrandfetchAdmin(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_BRAND_DOMAIN', message: 'Ingresa un dominio válido, por ejemplo marca.cl.' },
        })
      }

      try {
        const marca = await servicio.actualizarDominioBrandfetchAdmin(
          request.params.id,
          validacion.data.brandfetchDomain,
        )
        if (!marca) {
          return response.status(404).json({
            error: { code: 'ADMIN_BRAND_NOT_FOUND', message: 'No encontramos la marca solicitada.' },
          })
        }
        return response.json({ data: marca })
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

  // Subcategorías de una categoría (solo ADMIN). Segundo nivel de la taxonomía.
  adminRouter.get(
    '/categorias/:categoriaId/subcategorias',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const resultado = await servicio.listarSubcategoriasAdmin(request.params.categoriaId)
        if (!resultado) {
          return response.status(404).json({
            error: { code: 'ADMIN_CATEGORY_NOT_FOUND', message: 'No encontramos la categoría solicitada.' },
          })
        }
        return response.json(resultado)
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/categorias/:categoriaId/subcategorias',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarSubcategoriaNueva(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_SUBCATEGORY_DATA', message: 'Revisa los datos de la subcategoría.' },
        })
      }

      try {
        const subcategoria = await servicio.crearSubcategoriaAdmin(
          request.params.categoriaId,
          validacion.data,
        )
        if (!subcategoria) {
          return response.status(404).json({
            error: { code: 'ADMIN_CATEGORY_NOT_FOUND', message: 'No encontramos la categoría solicitada.' },
          })
        }
        return response.status(201).json({ data: subcategoria })
      } catch (error) {
        if (error instanceof ErrorSubcategoriaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'SUBCATEGORY_ALREADY_EXISTS', message: 'Ya existe una subcategoría con ese nombre en la categoría.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/subcategorias/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarSubcategoriaCambios(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_SUBCATEGORY_DATA', message: 'Revisa los datos de la subcategoría.' },
        })
      }

      try {
        const subcategoria = await servicio.actualizarSubcategoriaAdmin(
          request.params.id,
          validacion.data,
        )
        if (!subcategoria) {
          return response.status(404).json({
            error: { code: 'ADMIN_SUBCATEGORY_NOT_FOUND', message: 'No encontramos la subcategoría solicitada.' },
          })
        }
        return response.json({ data: subcategoria })
      } catch (error) {
        if (error instanceof ErrorSubcategoriaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'SUBCATEGORY_ALREADY_EXISTS', message: 'Ya existe una subcategoría con ese nombre en la categoría.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.delete(
    '/subcategorias/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const eliminada = await servicio.eliminarSubcategoriaAdmin(request.params.id)
        if (!eliminada) {
          return response.status(404).json({
            error: { code: 'ADMIN_SUBCATEGORY_NOT_FOUND', message: 'No encontramos la subcategoría solicitada.' },
          })
        }
        return response.status(204).end()
      } catch (error) {
        if (error instanceof ErrorSubcategoriaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  // Tercer nivel: sus rutas parten desde la subcategoría para que no pueda
  // crearse una hija huérfana. Solo ADMIN puede modificar la taxonomía.
  adminRouter.post(
    '/subcategorias/:subcategoriaId/hijas',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarSubcategoriaHijaNueva(request.body)
      if (!validacion.success) {
        return response.status(422).json({ error: { code: 'INVALID_CHILD_CATEGORY_DATA', message: 'Revisa los datos del tercer nivel.' } })
      }
      try {
        const hija = await crearSubcategoriaHijaAdmin(request.params.subcategoriaId, validacion.data)
        if (!hija) {
          return response.status(404).json({ error: { code: 'ADMIN_SUBCATEGORY_NOT_FOUND', message: 'No encontramos la subcategoría solicitada.' } })
        }
        return response.status(201).json({ data: hija })
      } catch (error) {
        if (error instanceof ErrorSubcategoriaHijaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({ error: { code: 'CHILD_CATEGORY_ALREADY_EXISTS', message: 'Ya existe este nombre en la subcategoría.' } })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/subcategorias-hijas/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarSubcategoriaHijaCambios(request.body)
      if (!validacion.success) {
        return response.status(422).json({ error: { code: 'INVALID_CHILD_CATEGORY_DATA', message: 'Revisa los datos del tercer nivel.' } })
      }
      try {
        const hija = await actualizarSubcategoriaHijaAdmin(request.params.id, validacion.data)
        if (!hija) {
          return response.status(404).json({ error: { code: 'ADMIN_CHILD_CATEGORY_NOT_FOUND', message: 'No encontramos el nivel solicitado.' } })
        }
        return response.json({ data: hija })
      } catch (error) {
        if (error instanceof ErrorSubcategoriaHijaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({ error: { code: 'CHILD_CATEGORY_ALREADY_EXISTS', message: 'Ya existe este nombre en la subcategoría.' } })
        }
        return next(error)
      }
    },
  )

  adminRouter.delete(
    '/subcategorias-hijas/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const eliminada = await eliminarSubcategoriaHijaAdmin(request.params.id)
        if (!eliminada) {
          return response.status(404).json({ error: { code: 'ADMIN_CHILD_CATEGORY_NOT_FOUND', message: 'No encontramos el nivel solicitado.' } })
        }
        return response.status(204).end()
      } catch (error) {
        if (error instanceof ErrorSubcategoriaHijaAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  // Facetas configurables por categoría. La tienda las consumirá luego para
  // construir filtros reales, sin depender de nombres fijos en el frontend.
  adminRouter.get(
    '/categorias/:categoriaId/atributos',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const resultado = await servicio.listarAtributosAdmin(request.params.categoriaId)
        if (!resultado) {
          return response.status(404).json({
            error: { code: 'ADMIN_CATEGORY_NOT_FOUND', message: 'No encontramos la categoría solicitada.' },
          })
        }
        return response.json(resultado)
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/categorias/:categoriaId/atributos',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarAtributoNuevo(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_ATTRIBUTE_DATA', message: 'Revisa los datos del atributo.' },
        })
      }
      try {
        const atributo = await servicio.crearAtributoAdmin(request.params.categoriaId, validacion.data)
        if (!atributo) {
          return response.status(404).json({
            error: { code: 'ADMIN_CATEGORY_NOT_FOUND', message: 'No encontramos la categoría solicitada.' },
          })
        }
        return response.status(201).json({ data: atributo })
      } catch (error) {
        if (error instanceof ErrorAtributoAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'ATTRIBUTE_ALREADY_EXISTS', message: 'Ya existe este atributo en la categoría.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/atributos/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarAtributoCambios(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_ATTRIBUTE_DATA', message: 'Revisa los datos del atributo.' },
        })
      }
      try {
        const atributo = await servicio.actualizarAtributoAdmin(request.params.id, validacion.data)
        if (!atributo) {
          return response.status(404).json({
            error: { code: 'ADMIN_ATTRIBUTE_NOT_FOUND', message: 'No encontramos el atributo solicitado.' },
          })
        }
        return response.json({ data: atributo })
      } catch (error) {
        if (error instanceof ErrorAtributoAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'ATTRIBUTE_ALREADY_EXISTS', message: 'Ya existe este atributo en la categoría.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.delete(
    '/atributos/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const eliminado = await servicio.eliminarAtributoAdmin(request.params.id)
        if (!eliminado) {
          return response.status(404).json({
            error: { code: 'ADMIN_ATTRIBUTE_NOT_FOUND', message: 'No encontramos el atributo solicitado.' },
          })
        }
        return response.status(204).end()
      } catch (error) {
        if (error instanceof ErrorAtributoAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/atributos/:atributoId/opciones',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarOpcionAtributoNueva(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_ATTRIBUTE_OPTION_DATA', message: 'Revisa los datos de la opción.' },
        })
      }
      try {
        const opcion = await servicio.crearOpcionAtributoAdmin(request.params.atributoId, validacion.data)
        if (!opcion) {
          return response.status(404).json({
            error: { code: 'ADMIN_ATTRIBUTE_NOT_FOUND', message: 'No encontramos el atributo solicitado.' },
          })
        }
        return response.status(201).json({ data: opcion })
      } catch (error) {
        if (error instanceof ErrorAtributoAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'ATTRIBUTE_OPTION_ALREADY_EXISTS', message: 'Ya existe esta opción en el atributo.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/atributos-opciones/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarOpcionAtributoCambios(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: { code: 'INVALID_ATTRIBUTE_OPTION_DATA', message: 'Revisa los datos de la opción.' },
        })
      }
      try {
        const opcion = await servicio.actualizarOpcionAtributoAdmin(request.params.id, validacion.data)
        if (!opcion) {
          return response.status(404).json({
            error: { code: 'ADMIN_ATTRIBUTE_OPTION_NOT_FOUND', message: 'No encontramos la opción solicitada.' },
          })
        }
        return response.json({ data: opcion })
      } catch (error) {
        if (error instanceof ErrorAtributoAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        if (error.code === 'P2002') {
          return response.status(409).json({
            error: { code: 'ATTRIBUTE_OPTION_ALREADY_EXISTS', message: 'Ya existe esta opción en el atributo.' },
          })
        }
        return next(error)
      }
    },
  )

  adminRouter.delete(
    '/atributos-opciones/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const eliminado = await servicio.eliminarOpcionAtributoAdmin(request.params.id)
        if (!eliminado) {
          return response.status(404).json({
            error: { code: 'ADMIN_ATTRIBUTE_OPTION_NOT_FOUND', message: 'No encontramos la opción solicitada.' },
          })
        }
        return response.status(204).end()
      } catch (error) {
        if (error instanceof ErrorAtributoAdmin) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
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

  adminRouter.delete(
    '/marcas/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const eliminada = await servicio.eliminarMarcaAdmin(request.params.id)
        if (!eliminada) {
          return response.status(404).json({
            error: { code: 'ADMIN_BRAND_NOT_FOUND', message: 'No encontramos la marca solicitada.' },
          })
        }
        return response.status(204).end()
      } catch (error) {
        if (error instanceof ErrorMarcaAdmin) {
          return response.status(409).json({ error: { code: error.code, message: error.message } })
        }
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

  adminRouter.patch(
    '/productos/:id/restaurar',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const producto = await servicio.restaurarProducto(request.params.id)
        if (!producto) {
          return response.status(404).json({
            error: { code: 'ADMIN_PRODUCT_NOT_FOUND', message: 'No encontramos el producto solicitado.' },
          })
        }
        return response.json({ data: producto })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.delete(
    '/productos/:id/definitivo',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const eliminado = await servicio.eliminarProducto(request.params.id)
        if (!eliminado) {
          return response.status(404).json({
            error: { code: 'ADMIN_PRODUCT_NOT_FOUND', message: 'No encontramos el producto solicitado.' },
          })
        }
        return response.status(204).end()
      } catch (error) {
        // Producto con ventas: no se elimina en firme, se archiva (409).
        if (error instanceof ErrorProductoAdmin) {
          return response.status(409).json({ error: { code: error.code, message: error.message } })
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
        if (error instanceof ErrorProductoAdmin) {
          return response.status(422).json({
            error: { code: error.code, message: error.message },
          })
        }
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
      const q = typeof request.query.q === 'string' ? request.query.q : ''

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
        return response.json(await servicio.listarPedidos({ page, limit, estado, q }))
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

  // Tablero de Resumen: métricas del período (ventas, pedidos, ticket) más
  // señales operativas vivas (pendientes, stock crítico). Lo ve el equipo.
  adminRouter.get(
    '/resumen',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const periodo =
        typeof request.query.periodo === 'string' ? request.query.periodo : 'mes'

      if (!PERIODOS_RESUMEN.includes(periodo)) {
        return response.status(400).json({
          error: {
            code: 'INVALID_QUERY_PARAM',
            message: `periodo debe ser uno de: ${PERIODOS_RESUMEN.join(', ')}.`,
          },
        })
      }

      try {
        return response.json({ data: await servicio.obtenerResumen({ periodo }) })
      } catch (error) {
        return next(error)
      }
    },
  )

  // Serie de ventas por día (gráfico de tendencia). Ventana fija de N días.
  adminRouter.get(
    '/resumen/ventas-diarias',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const dias = leerEnteroPositivo(request.query.dias, 14, 90)
      if (dias === null) {
        return response.status(400).json({
          error: { code: 'INVALID_QUERY_PARAM', message: 'dias debe estar entre 1 y 90.' },
        })
      }

      try {
        return response.json({ data: await servicio.obtenerVentasDiarias({ dias }) })
      } catch (error) {
        return next(error)
      }
    },
  )

  // Más vendidos del período (dos rankings: unidades e ingresos).
  adminRouter.get(
    '/resumen/mas-vendidos',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const periodo =
        typeof request.query.periodo === 'string' ? request.query.periodo : 'mes'

      if (!PERIODOS_RESUMEN.includes(periodo)) {
        return response.status(400).json({
          error: {
            code: 'INVALID_QUERY_PARAM',
            message: `periodo debe ser uno de: ${PERIODOS_RESUMEN.join(', ')}.`,
          },
        })
      }

      try {
        return response.json({ data: await servicio.obtenerMasVendidos({ periodo }) })
      } catch (error) {
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

  // Clientes: directorio de la tienda (lista con búsqueda + ficha). Solo lectura;
  // la gestión (activar/desactivar) se agregará en una entrega posterior. Lo ve el
  // equipo, no solo ADMIN: atender a un cliente es una tarea operativa.
  adminRouter.get(
    '/clientes',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const page = leerEnteroPositivo(request.query.page, 1)
      const limit = leerEnteroPositivo(request.query.limit, 20, 100)
      const query = typeof request.query.q === 'string' ? request.query.q : ''

      if (page === null || limit === null) {
        return response.status(400).json({
          error: {
            code: 'INVALID_QUERY_PARAM',
            message: 'page debe ser positivo y limit debe estar entre 1 y 100.',
          },
        })
      }

      try {
        return response.json(await servicio.listarClientesAdmin({ page, limit, query }))
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/clientes/:id',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const cliente = await servicio.obtenerClienteAdmin(request.params.id)
        if (!cliente) {
          return response.status(404).json({
            error: { code: 'ADMIN_CUSTOMER_NOT_FOUND', message: 'No encontramos el cliente solicitado.' },
          })
        }
        return response.json({ data: cliente })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/clientes/:id/activar',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const cliente = await servicio.cambiarEstadoClienteAdmin(request.params.id, true)
        if (!cliente) {
          return response.status(404).json({
            error: { code: 'ADMIN_CUSTOMER_NOT_FOUND', message: 'No encontramos el cliente solicitado.' },
          })
        }
        return response.json({ data: cliente })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/clientes/:id/desactivar',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const cliente = await servicio.cambiarEstadoClienteAdmin(request.params.id, false)
        if (!cliente) {
          return response.status(404).json({
            error: { code: 'ADMIN_CUSTOMER_NOT_FOUND', message: 'No encontramos el cliente solicitado.' },
          })
        }
        return response.json({ data: cliente })
      } catch (error) {
        return next(error)
      }
    },
  )

  // Inventario: vista de stock por producto con filtro "bajo stock". Solo lectura
  // en esta entrega (el ajuste con motivo llega en el checkout B). Lo ve el equipo.
  adminRouter.get(
    '/inventario',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const page = leerEnteroPositivo(request.query.page, 1)
      const limit = leerEnteroPositivo(request.query.limit, 20, 100)
      const query = typeof request.query.q === 'string' ? request.query.q : ''
      const soloBajoStock = request.query.bajoStock === '1' || request.query.bajoStock === 'true'

      if (page === null || limit === null) {
        return response.status(400).json({
          error: {
            code: 'INVALID_QUERY_PARAM',
            message: 'page debe ser positivo y limit debe estar entre 1 y 100.',
          },
        })
      }

      try {
        return response.json(await servicio.listarInventarioAdmin({ page, limit, query, soloBajoStock }))
      } catch (error) {
        return next(error)
      }
    },
  )

  // Historial de movimientos de stock de un producto (auditoría).
  adminRouter.get(
    '/inventario/:id/movimientos',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      try {
        const movimientos = await servicio.listarMovimientosAdmin(request.params.id)
        if (movimientos === null) {
          return response.status(404).json({
            error: { code: 'ADMIN_PRODUCT_NOT_FOUND', message: 'No encontramos el producto solicitado.' },
          })
        }
        return response.json({ data: movimientos })
      } catch (error) {
        return next(error)
      }
    },
  )

  // Ajuste manual de stock: crea un movimiento y actualiza el stock en una
  // transacción. El usuarioId sale de la sesión, nunca del cuerpo.
  adminRouter.post(
    '/inventario/:id/movimientos',
    middlewareSesion,
    requerirRoles('ADMIN', 'OPERADOR'),
    async (request, response, next) => {
      const validacion = validarAjusteStock(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_STOCK_ADJUSTMENT',
            message: 'Revisa los datos del ajuste de stock.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const resultado = await servicio.ajustarStockAdmin({
          productoId: request.params.id,
          delta: validacion.data.delta,
          motivo: validacion.data.motivo,
          nota: validacion.data.nota,
          usuarioId: request.usuario.id,
        })
        if (!resultado) {
          return response.status(404).json({
            error: { code: 'ADMIN_PRODUCT_NOT_FOUND', message: 'No encontramos el producto solicitado.' },
          })
        }
        return response.status(201).json({ data: resultado })
      } catch (error) {
        // Reglas de negocio (signo del motivo, stock negativo) → 409 conflicto.
        if (error instanceof ErrorInventario) {
          return response.status(409).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  // Identidad de la tienda (nombre, contacto, redes). Solo ADMIN: es configuración
  // de marca, no una tarea operativa. Mismo patrón que reglas.
  adminRouter.get(
    '/identidad',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (_request, response, next) => {
      try {
        return response.json({ data: await servicio.obtenerIdentidad() })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.put(
    '/identidad',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarIdentidad(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_STORE_IDENTITY',
            message: 'Revisa los datos de la tienda.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const identidad = await servicio.actualizarIdentidad(validacion.data)
        return response.json({ data: identidad })
      } catch (error) {
        return next(error)
      }
    },
  )

  // Páginas de contenido (nosotros, términos, privacidad, faq). Solo ADMIN: es
  // contenido editorial del sitio, no una tarea operativa.
  adminRouter.get(
    '/paginas',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (_request, response, next) => {
      try {
        return response.json({ data: await servicio.listarPaginasAdmin() })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/paginas/:slug',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const pagina = await servicio.obtenerPaginaAdmin(request.params.slug)
        if (!pagina) {
          return response.status(404).json({
            error: { code: 'ADMIN_PAGE_NOT_FOUND', message: 'Esa página no existe.' },
          })
        }
        return response.json({ data: pagina })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.put(
    '/paginas/:slug',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarPagina(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_PAGE_DATA',
            message: 'Revisa los datos de la página.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const pagina = await servicio.guardarPaginaAdmin(request.params.slug, validacion.data)
        if (!pagina) {
          return response.status(404).json({
            error: { code: 'ADMIN_PAGE_NOT_FOUND', message: 'Esa página no existe.' },
          })
        }
        return response.json({ data: pagina })
      } catch (error) {
        return next(error)
      }
    },
  )

  // Banners del carrusel del home (solo ADMIN). Sube la imagen aparte y luego crea
  // el banner con su url + storageKey (mismo flujo que las imágenes de producto).
  adminRouter.get(
    '/banners',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (_request, response, next) => {
      try {
        return response.json({ data: await servicio.listarBannersAdmin() })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/banners/imagen',
    middlewareSesion,
    requerirRoles('ADMIN'),
    recibirImagenBanner,
    async (request, response, next) => {
      try {
        const imagen = await servicio.subirImagenBanner(request.file)
        return response.status(201).json({ data: imagen })
      } catch (error) {
        if (error instanceof ErrorImagen) {
          return response.status(422).json({ error: { code: error.code, message: error.message } })
        }
        return next(error)
      }
    },
  )

  adminRouter.get(
    '/banners/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const banner = await servicio.obtenerBannerAdmin(request.params.id)
        if (!banner) {
          return response.status(404).json({
            error: { code: 'ADMIN_BANNER_NOT_FOUND', message: 'No encontramos el banner solicitado.' },
          })
        }
        return response.json({ data: banner })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.post(
    '/banners',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarBannerNuevo(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_BANNER_DATA',
            message: 'Revisa los datos del banner.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const banner = await servicio.crearBanner(validacion.data)
        return response.status(201).json({ data: banner })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.patch(
    '/banners/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      const validacion = validarBannerCambios(request.body)
      if (!validacion.success) {
        return response.status(422).json({
          error: {
            code: 'INVALID_BANNER_DATA',
            message: 'Revisa los datos del banner.',
            fields: validacion.error.issues.map((issue) => issue.path.join('.')),
          },
        })
      }

      try {
        const banner = await servicio.actualizarBanner(request.params.id, validacion.data)
        if (!banner) {
          return response.status(404).json({
            error: { code: 'ADMIN_BANNER_NOT_FOUND', message: 'No encontramos el banner solicitado.' },
          })
        }
        return response.json({ data: banner })
      } catch (error) {
        return next(error)
      }
    },
  )

  adminRouter.delete(
    '/banners/:id',
    middlewareSesion,
    requerirRoles('ADMIN'),
    async (request, response, next) => {
      try {
        const eliminado = await servicio.eliminarBanner(request.params.id)
        if (!eliminado) {
          return response.status(404).json({
            error: { code: 'ADMIN_BANNER_NOT_FOUND', message: 'No encontramos el banner solicitado.' },
          })
        }
        return response.status(204).end()
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
