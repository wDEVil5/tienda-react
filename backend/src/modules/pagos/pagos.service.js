import { repositorioPagos } from './pagos.repository.js'
import { crearPasarelaFalsa } from './pagos.pasarela.js'

export class ErrorPago extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// La pasarela por defecto es la falsa hasta enchufar Mercado Pago (CP4). El
// proveedor real se seleccionará por entorno, igual que el transporte de correo.
export function crearServicioPagos({
  repositorio = repositorioPagos,
  pasarela = crearPasarelaFalsa(),
} = {}) {
  return {
    // Inicia el pago de un pedido: crea el registro de pago, pide una preferencia
    // a la pasarela y devuelve la URL a la que redirigir al cliente. El estado
    // real del pago lo confirmará el webhook (CP3), no esta llamada.
    async iniciarPago(pedidoId) {
      const pedido = await repositorio.obtenerPedidoParaPago(pedidoId)
      if (!pedido) {
        throw new ErrorPago('ORDER_NOT_FOUND', 'No encontramos el pedido.')
      }
      // Solo se paga un pedido que sigue pendiente.
      if (pedido.estado !== 'PENDIENTE') {
        throw new ErrorPago('ORDER_NOT_PAYABLE', 'El pedido no está pendiente de pago.')
      }
      if (await repositorio.tienePagoAprobado(pedido.id)) {
        throw new ErrorPago('ORDER_ALREADY_PAID', 'El pedido ya fue pagado.')
      }

      // El monto se congela desde el total del pedido (verdad del servidor).
      const pago = await repositorio.crearPago({
        pedidoId: pedido.id,
        proveedor: pasarela.proveedor,
        monto: pedido.total,
      })

      // Se crea el pago primero para tener un id que correlacionar; si la pasarela
      // falla, el pago queda PENDIENTE sin referencia (inofensivo, se puede
      // reintentar o expira con el pedido).
      const { referenciaExterna, urlPago } = await pasarela.crearPreferencia({
        pagoId: pago.id,
        pedidoNumero: pedido.numero,
        monto: pedido.total,
      })

      await repositorio.fijarReferencia(pago.id, referenciaExterna)

      return { pagoId: pago.id, referenciaExterna, urlPago }
    },
  }
}

const servicioPagos = crearServicioPagos()

export const iniciarPago = (pedidoId) => servicioPagos.iniciarPago(pedidoId)
