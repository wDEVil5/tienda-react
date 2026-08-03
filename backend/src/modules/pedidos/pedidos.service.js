import { repositorioPedidos } from './pedidos.repository.js'
import { calcularCostoEnvio } from '../../lib/reglasTienda.js'
import { obtenerReglas as obtenerReglasVigentes } from '../reglas/reglas.service.js'
import { notificadorPedidos } from './pedidos.notificaciones.js'
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

// Construye las líneas a partir de la entrada validada y los productos del
// repositorio. Valida existencia siempre; el stock solo al crear (una cotización
// no necesita disponibilidad). Compartido por crearPedido y cotizarPedido.
function construirLineas(entrada, productos, { validarStock }) {
  const porId = new Map(productos.map((producto) => [producto.id, producto]))

  return entrada.items.map((item) => {
    const producto = porId.get(item.productoId)
    if (!producto) {
      throw new ErrorPedido(
        'PRODUCT_NOT_AVAILABLE',
        'Uno de los productos ya no está disponible.',
      )
    }

    if (validarStock) {
      // Chequeo optimista (la reserva atómica definitiva ocurre en la transacción).
      const disponible = producto.stock - producto.stockReservado
      if (item.cantidad > disponible) {
        throw new ErrorPedido(
          'INSUFFICIENT_STOCK',
          `No hay stock suficiente de ${producto.nombre}.`,
        )
      }
    }

    return calcularLinea(producto, item.cantidad)
  })
}

// total = subtotal (a precio normal) - descuento + envío. Reproduce el resumen
// del checkout y garantiza que Σ(item.subtotal) + envío === total.
function calcularTotales({ modalidad, comuna }, items, reglas) {
  const subtotal = items.reduce((suma, item) => suma + item.precioNormal * item.cantidad, 0)
  const descuento = items.reduce(
    (suma, item) => suma + (item.precioNormal - item.precioFinal) * item.cantidad,
    0,
  )
  const costoEnvio = calcularCostoEnvio({ modalidad, comuna, subtotal }, reglas)
  return { subtotal, descuento, costoEnvio, total: subtotal - descuento + costoEnvio }
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

export function crearServicioPedidos(
  repositorio = repositorioPedidos,
  { obtenerReglas = obtenerReglasVigentes, notificador = notificadorPedidos } = {},
) {
  return {
    async crearPedido(entrada, { clienteId = null, ahora = new Date() } = {}) {
      // Se recalcula TODO con la verdad del servidor; nada de montos del cliente.
      // Las reglas (umbral, tarifas) también vienen del servidor, editables por
      // el dueño; nunca del cliente.
      const [productos, reglas] = await Promise.all([
        repositorio.obtenerParaPedido(
          entrada.items.map((item) => item.productoId),
          ahora,
        ),
        obtenerReglas(),
      ])
      const items = construirLineas(entrada, productos, { validarStock: true })
      const totales = calcularTotales(
        { modalidad: entrada.modalidad, comuna: entrada.direccion?.comuna },
        items,
        reglas,
      )

      const pedido = {
        // Dueño de la cuenta (null si es invitado). Viene de la sesión de
        // cliente en la ruta, jamás del cuerpo de la petición.
        clienteId,
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
        ...totales,
      }

      const pedidoCreado = await repositorio.crearPedidoTransaccional({ pedido, items })

      // Confirmación por correo, fire-and-forget: la compra no debe fallar ni
      // demorarse si el proveedor de correo está caído. Un fallo se registra.
      notificador
        .enviarConfirmacion(pedidoCreado)
        .catch((error) =>
          console.error(
            `No se pudo enviar la confirmación del pedido ${pedidoCreado.numero}: ${error.message}`,
          ),
        )

      return pedidoCreado
    },

    // Calcula los montos vigentes SIN crear el pedido ni reservar stock. Alimenta
    // el resumen del checkout, manteniendo al servidor como fuente de la verdad.
    async cotizarPedido(entrada, ahora = new Date()) {
      const [productos, reglas] = await Promise.all([
        repositorio.obtenerParaPedido(
          entrada.items.map((item) => item.productoId),
          ahora,
        ),
        obtenerReglas(),
      ])
      const items = construirLineas(entrada, productos, { validarStock: false })
      const totales = calcularTotales(
        { modalidad: entrada.modalidad, comuna: entrada.comuna },
        items,
        reglas,
      )

      return {
        items: items.map((item) => ({
          nombre: item.nombre,
          sku: item.sku,
          cantidad: item.cantidad,
          precioNormal: item.precioNormal,
          precioFinal: item.precioFinal,
          subtotal: item.subtotal,
        })),
        ...totales,
      }
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

    // Historial del cliente: mismas formas que el panel, pero SIEMPRE acotadas a
    // su clienteId. Un pedido ajeno o inexistente devuelve null → 404.
    async listarPedidosDeCliente(clienteId, { page = 1, limit = 20, estado } = {}) {
      const filtros = { page, limit, clienteId, ...(estado ? { estado } : {}) }
      const [pedidos, total] = await Promise.all([
        repositorio.listar(filtros),
        repositorio.contar(filtros),
      ])

      return {
        data: pedidos.map(crearResumenPedido),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

    async obtenerPedidoDeCliente(clienteId, id) {
      const pedido = await repositorio.obtenerPorId(id, { clienteId })
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
export const cotizarPedido = servicioPedidos.cotizarPedido
export const listarPedidos = servicioPedidos.listarPedidos
export const obtenerDetallePedido = servicioPedidos.obtenerDetallePedido
export const cambiarEstadoPedido = servicioPedidos.cambiarEstadoPedido
export const listarPedidosDeCliente = servicioPedidos.listarPedidosDeCliente
export const obtenerPedidoDeCliente = servicioPedidos.obtenerPedidoDeCliente
