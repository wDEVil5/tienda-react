import { repositorioPedidos } from './pedidos.repository.js'
import { calcularCostoEnvio } from '../../lib/reglasTienda.js'
import { ESTADO_INICIAL } from './pedidos.estados.js'
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
  }
}

const servicioPedidos = crearServicioPedidos()

export const crearPedido = servicioPedidos.crearPedido
