import { Router } from 'express'
import { crearPedido, cotizarPedido, ErrorPedido } from './pedidos.service.js'
import { validarCotizacion, validarPedidoNuevo } from './pedidos.validacion.js'
import { clienteOpcional } from '../cuenta/cuenta.middleware.js'

// Contrato de SALIDA del pedido recién creado: campos intencionales para la
// pantalla de confirmación. No se filtran ids internos de ítems ni timestamps
// de auditoría; el detalle completo llegará por las rutas de administración.
function formatearPedido(pedido) {
  return {
    id: pedido.id,
    numero: pedido.numero,
    estado: pedido.estado,
    modalidad: pedido.modalidad,
    contacto: {
      nombre: pedido.contactoNombre,
      email: pedido.contactoEmail,
      telefono: pedido.contactoTelefono,
    },
    direccion:
      pedido.modalidad === 'DESPACHO'
        ? {
            calle: pedido.dirCalle,
            depto: pedido.dirDepto,
            comuna: pedido.dirComuna,
            region: pedido.dirRegion,
            instrucciones: pedido.dirInstrucciones,
          }
        : null,
    items: (pedido.items ?? []).map((item) => ({
      nombre: item.nombre,
      sku: item.sku,
      cantidad: item.cantidad,
      precioNormal: item.precioNormal,
      precioFinal: item.precioFinal,
      subtotal: item.subtotal,
    })),
    subtotal: pedido.subtotal,
    descuento: pedido.descuento,
    costoEnvio: pedido.costoEnvio,
    total: pedido.total,
    createdAt: pedido.createdAt,
  }
}

export function crearRouterPedidos({
  servicio = { crearPedido, cotizarPedido },
  middlewareCliente = clienteOpcional,
} = {}) {
  const pedidosRouter = Router()

  // Cotización: montos calculados en el servidor sin crear el pedido. La usa el
  // resumen del checkout para mostrar el envío antes de confirmar.
  pedidosRouter.post('/cotizar', async (request, response, next) => {
    const validacion = validarCotizacion(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_QUOTE_DATA',
          message: 'Revisa el pedido a cotizar.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      const cotizacion = await servicio.cotizarPedido(validacion.data)
      return response.json({ data: cotizacion })
    } catch (error) {
      if (error instanceof ErrorPedido) {
        return response.status(409).json({
          error: { code: error.code, message: error.message },
        })
      }
      return next(error)
    }
  })

  // clienteOpcional: enlaza el pedido a la cuenta si el comprador está logueado;
  // el invitado (sin sesión) pasa igual y el pedido queda sin dueño.
  pedidosRouter.post('/', middlewareCliente, async (request, response, next) => {
    const validacion = validarPedidoNuevo(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: {
          code: 'INVALID_ORDER_DATA',
          message: 'Revisa los datos del pedido.',
          fields: validacion.error.issues.map((issue) => issue.path.join('.')),
        },
      })
    }

    try {
      const pedido = await servicio.crearPedido(validacion.data, {
        clienteId: request.cliente?.id ?? null,
      })
      return response.status(201).json({ data: formatearPedido(pedido) })
    } catch (error) {
      // 409 Conflict: el estado del catálogo (sin stock, no publicado) impide
      // cumplir un pedido que en sí venía bien formado.
      if (error instanceof ErrorPedido) {
        return response.status(409).json({
          error: {
            code: error.code,
            message: error.message,
            // Faltantes de stock (qué producto y cuánto hay), si el error los trae.
            ...(error.details ? { details: error.details } : {}),
          },
        })
      }
      return next(error)
    }
  })

  return pedidosRouter
}

export default crearRouterPedidos()
