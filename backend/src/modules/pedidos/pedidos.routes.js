import { Router } from 'express'
import { crearPedido, ErrorPedido } from './pedidos.service.js'
import { validarPedidoNuevo } from './pedidos.validacion.js'

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

export function crearRouterPedidos({ servicio = { crearPedido } } = {}) {
  const pedidosRouter = Router()

  pedidosRouter.post('/', async (request, response, next) => {
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
      const pedido = await servicio.crearPedido(validacion.data)
      return response.status(201).json({ data: formatearPedido(pedido) })
    } catch (error) {
      // 409 Conflict: el estado del catálogo (sin stock, no publicado) impide
      // cumplir un pedido que en sí venía bien formado.
      if (error instanceof ErrorPedido) {
        return response.status(409).json({
          error: { code: error.code, message: error.message },
        })
      }
      return next(error)
    }
  })

  return pedidosRouter
}

export default crearRouterPedidos()
