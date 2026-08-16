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

// Resumen para listados: conteos y, como máximo, tres miniaturas reales. Estas
// no son snapshots del pedido: si un producto ya no existe, se omiten en vez de
// devolver una imagen inventada. El detalle conserva los datos congelados.
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
    previsualizaciones: pedido.items
      .flatMap((item) => item.producto?.imagenes?.slice(0, 1) ?? [])
      .slice(0, 3)
      .map((imagen) => ({
        url: imagen.url,
        textoAlternativo: imagen.textoAlternativo,
      })),
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
    items: pedido.items.map((item) => {
      // El histórico se pinta siempre con el snapshot. Solo exponemos el
      // producto actual cuando sigue PUBLICADO, para no reponer borradores o
      // productos eliminados desde un pedido antiguo.
      const producto = item.producto?.estado === 'PUBLICADO' ? item.producto : null
      return {
        nombre: item.nombre,
        sku: item.sku,
        cantidad: item.cantidad,
        precioNormal: item.precioNormal,
        precioFinal: item.precioFinal,
        subtotal: item.subtotal,
        productoActual: producto
          ? {
              id: producto.id,
              slug: producto.slug,
              nombre: producto.nombre,
              precio: producto.precio,
              precioAnterior: producto.precioAnterior,
              stock: Math.max(0, producto.stock - producto.stockReservado),
              imagen: producto.imagenes[0]?.url ?? null,
            }
          : null,
      }
    }),
    // Stats del cliente (pedidos previos, total gastado, frecuente). Lo llena el
    // servicio en el detalle del panel; null para invitados o vistas de cliente.
    cliente: null,
    subtotal: pedido.subtotal,
    descuento: pedido.descuento,
    costoEnvio: pedido.costoEnvio,
    total: pedido.total,
    eventos: pedido.eventos.map((evento) => ({
      estado: evento.estado,
      nota: evento.nota,
      createdAt: evento.createdAt,
    })),
    pagos: (pedido.pagos ?? []).map((pago) => ({
      proveedor: pago.proveedor,
      estado: pago.estado,
      createdAt: pago.createdAt,
      updatedAt: pago.updatedAt,
    })),
    createdAt: pedido.createdAt,
  }
}

// Ventana por defecto tras la cual un pedido PENDIENTE sin confirmar se expira y
// libera su reserva. Configurable por entorno. 60 min: el pago es Mercado Pago
// online (aprueba en segundos por webhook), así que un pendiente de más de una
// hora es casi siempre un checkout abandonado; una hora deja margen de sobra
// para cualquier demora real de red o de la cola del proveedor.
const MINUTOS_EXPIRACION_PENDIENTE = Number(process.env.MINUTOS_EXPIRACION_PENDIENTE) || 60

// A partir de cuántos pedidos pagados un cliente se marca como "frecuente" en el
// panel. Umbral de negocio, fácil de ajustar; 3 es el punto típico de "cliente
// que ya volvió más de una vez".
const UMBRAL_CLIENTE_FRECUENTE = 3

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

      // OJO: la confirmación por correo NO se envía aquí. El pedido recién creado
      // está PENDIENTE de pago; el correo saldría aunque el pago falle o nunca se
      // haga. Se envía cuando el pago se aprueba (webhook), en el módulo de pagos.

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

    async listarPedidos({ page = 1, limit = 20, estado, q } = {}) {
      const filtros = { page, limit, q, ...(estado ? { estado } : {}) }
      // Los conteos por estado ignoran el filtro de estado (cada chip cuenta lo
      // suyo) pero respetan la búsqueda, así los números cuadran con la lista.
      const [pedidos, total, conteos] = await Promise.all([
        repositorio.listar(filtros),
        repositorio.contar(filtros),
        repositorio.contarPorEstado({ q }),
      ])

      return {
        data: pedidos.map(crearResumenPedido),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit), conteos },
      }
    },

    async obtenerDetallePedido(id) {
      const pedido = await repositorio.obtenerPorId(id)
      if (!pedido) return null

      const detalle = crearDetallePedido(pedido)

      // Stats del cliente para el panel: solo si el pedido tiene cuenta asociada
      // (los de invitado no se pueden agregar de forma confiable). "Frecuente" es
      // una regla de negocio que vive aquí, no en el repositorio.
      if (pedido.clienteId) {
        const stats = await repositorio.estadisticasCliente(pedido.clienteId, { excluyendoId: id })
        detalle.cliente = {
          pedidosAnteriores: stats.pedidosAnteriores,
          totalGastado: stats.totalGastado,
          frecuente: stats.pedidosPagados >= UMBRAL_CLIENTE_FRECUENTE,
        }
      }

      return detalle
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

      // Barrera de pago: sacar un pedido de PENDIENTE hacia el cumplimiento
      // (PREPARANDO) equivale a confirmar la venta y CONSUME el stock reservado.
      // Solo el pago aprobado habilita ese salto; a mano únicamente se puede
      // CANCELAR un pedido impago. Esto evita despachar mercadería no pagada.
      if (pedido.estado === 'PENDIENTE' && nuevoEstado !== 'CANCELADO') {
        const tienePagoAprobado = pedido.pagos.some((pago) => pago.estado === 'APROBADO')
        if (!tienePagoAprobado) {
          throw new ErrorPedido(
            'PAYMENT_REQUIRED',
            'El pedido no tiene un pago aprobado: solo puede cancelarse hasta que se confirme el pago.',
          )
        }
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

      // Aviso del nuevo estado al cliente (RF-5.6), fire-and-forget: cambiar el
      // estado no debe fallar ni demorarse si el proveedor de correo está caído.
      notificador
        .enviarCambioEstado(actualizado)
        .catch((error) =>
          console.error(
            `No se pudo avisar el cambio de estado del pedido ${actualizado.numero}: ${error.message}`,
          ),
        )

      return crearDetallePedido(actualizado)
    },

    // Barrido de expiración: cancela los pedidos PENDIENTE más viejos que la
    // ventana y libera su reserva de stock. Es puramente temporal (no hay un
    // evento que enganchar), así que lo corre un cron o el script pedidos:expirar.
    // Cada cancelación es atómica y segura ante la carrera con el dueño.
    async expirarPedidosPendientes({
      ahora = new Date(),
      minutos = MINUTOS_EXPIRACION_PENDIENTE,
      limite = 100,
    } = {}) {
      const antesDe = new Date(ahora.getTime() - minutos * 60_000)
      const vencidos = await repositorio.listarPendientesExpirados(antesDe, limite)

      let expirados = 0
      for (const { id } of vencidos) {
        const cancelado = await repositorio.expirarPendienteTransaccional(
          id,
          `Expirado automáticamente por falta de confirmación (${minutos} min).`,
        )
        if (cancelado) expirados += 1
      }

      return { revisados: vencidos.length, expirados }
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
export const expirarPedidosPendientes = servicioPedidos.expirarPedidosPendientes
