import { repositorioPedidos } from './pedidos.repository.js'
import { calcularCostoEnvio } from '../../lib/reglasTienda.js'
import {
  ESTADO_INICIAL,
  efectoStockTransicion,
  esTransicionValida,
} from './pedidos.estados.js'
import { ErrorPedido } from './pedidos.errores.js'

export { ErrorPedido }

// Congela la línea de un ítem con los precios VIGENTES del servidor. Solo hay
// descuento si la oferta está vigente ahora: un precioAnterior guardado sin
// campaña activa no aplica (regla "ofertas sin vigencia").
function calcularLinea(producto, cantidad) {
  const precioFinal = producto.precio
  const precioNormal =
    producto.tieneOfertaVigente && producto.precioAnterior
      ? producto.precioAnterior
      : producto.precio

  return {
    productoId: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
    precioNormal,
    precioFinal,
    cantidad,
    subtotal: precioFinal * cantidad,
  }
}

// Resumen para el listado del panel: lo justo para una fila (incluye conteos
// de productos y unidades, y la comuna solo si es despacho).
function crearResumenPedido(pedido) {
  return {
    id: pedido.id,
    numero: pedido.numero,
    estado: pedido.estado,
    modalidad: pedido.modalidad,
    contactoNombre: pedido.contactoNombre,
    comuna: pedido.modalidad === 'DESPACHO' ? pedido.dirComuna : null,
    cantidadProductos: pedido.items.length,
    cantidadUnidades: pedido.items.reduce((suma, item) => suma + item.cantidad, 0),
    total: pedido.total,
    createdAt: pedido.createdAt,
  }
}

// Detalle completo para la ficha de pedido: ítems, dirección (si aplica) y la
// línea de tiempo de eventos.
function crearDetallePedido(pedido) {
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
    items: pedido.items.map((item) => ({
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
    eventos: pedido.eventos.map((evento) => ({
      estado: evento.estado,
      nota: evento.nota,
      createdAt: evento.createdAt,
    })),
    createdAt: pedido.createdAt,
  }
}

export function crearServicioPedidos(repositorio = repositorioPedidos) {
  return {
    async crearPedido(entrada, ahora = new Date()) {
      const ids = entrada.items.map((item) => item.productoId)
      const productos = await repositorio.obtenerParaPedido(ids, ahora)
      const porId = new Map(productos.map((producto) => [producto.id, producto]))

      // Se recalcula TODO con la verdad del servidor; nada de montos del cliente.
      const items = entrada.items.map((item) => {
        const producto = porId.get(item.productoId)

        // El repositorio solo devuelve publicados: si falta, no está disponible.
        if (!producto) {
          throw new ErrorPedido(
            'PRODUCT_NOT_AVAILABLE',
            'Uno de los productos ya no está disponible.',
          )
        }

        // Chequeo optimista de stock (el disponible descuenta lo ya reservado).
        // La reserva definitiva y atómica ocurre en la transacción del repositorio.
        const disponible = producto.stock - producto.stockReservado
        if (item.cantidad > disponible) {
          throw new ErrorPedido(
            'INSUFFICIENT_STOCK',
            `No hay stock suficiente de ${producto.nombre}.`,
          )
        }

        return calcularLinea(producto, item.cantidad)
      })

      // Totales: subtotal a precio normal, descuento acumulado y envío por reglas.
      // total = subtotal - descuento + envío (reproduce el resumen del checkout).
      const subtotal = items.reduce(
        (suma, item) => suma + item.precioNormal * item.cantidad,
        0,
      )
      const descuento = items.reduce(
        (suma, item) => suma + (item.precioNormal - item.precioFinal) * item.cantidad,
        0,
      )
      const costoEnvio = calcularCostoEnvio({
        modalidad: entrada.modalidad,
        comuna: entrada.direccion?.comuna,
        subtotal,
      })
      const total = subtotal - descuento + costoEnvio

      const pedido = {
        estado: ESTADO_INICIAL,
        modalidad: entrada.modalidad,
        contactoNombre: entrada.contacto.nombre,
        contactoEmail: entrada.contacto.email,
        contactoTelefono: entrada.contacto.telefono,
        dirCalle: entrada.direccion?.calle ?? null,
        dirDepto: entrada.direccion?.depto ?? null,
        dirComuna: entrada.direccion?.comuna ?? null,
        dirRegion: entrada.direccion?.region ?? null,
        dirInstrucciones: entrada.direccion?.instrucciones ?? null,
        subtotal,
        descuento,
        costoEnvio,
        total,
      }

      return repositorio.crearPedidoTransaccional({ pedido, items })
    },

    async listarPedidos({ page = 1, limit = 20, estado } = {}) {
      const filtros = { page, limit, ...(estado ? { estado } : {}) }
      const [pedidos, total] = await Promise.all([
        repositorio.listar(filtros),
        repositorio.contar(filtros),
      ])

      return {
        data: pedidos.map(crearResumenPedido),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

    async obtenerDetallePedido(id) {
      const pedido = await repositorio.obtenerPorId(id)
      return pedido ? crearDetallePedido(pedido) : null
    },

    async cambiarEstadoPedido(id, nuevoEstado, nota) {
      const pedido = await repositorio.obtenerPorId(id)
      if (!pedido) return null

      // La máquina de estados decide si el salto es legal según la modalidad.
      if (!esTransicionValida({ desde: pedido.estado, hacia: nuevoEstado, modalidad: pedido.modalidad })) {
        throw new ErrorPedido(
          'INVALID_ORDER_TRANSITION',
          `No se puede pasar de ${pedido.estado} a ${nuevoEstado}.`,
        )
      }

      // El efecto sobre el inventario depende del par (estado actual → nuevo).
      const efecto = efectoStockTransicion(pedido.estado, nuevoEstado)

      const actualizado = await repositorio.cambiarEstadoTransaccional({
        id,
        nuevoEstado,
        nota,
        efecto,
        items: pedido.items,
      })

      return crearDetallePedido(actualizado)
    },
  }
}

const servicioPedidos = crearServicioPedidos()

export const crearPedido = servicioPedidos.crearPedido
export const listarPedidos = servicioPedidos.listarPedidos
export const obtenerDetallePedido = servicioPedidos.obtenerDetallePedido
export const cambiarEstadoPedido = servicioPedidos.cambiarEstadoPedido
