import { repositorioPagos } from './pagos.repository.js'
import { crearPasarelaFalsa } from './pagos.pasarela.js'
import { esTransicionPagoValida } from './pagos.estados.js'

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

    // Procesa una notificación del proveedor (webhook). Es la ÚNICA vía por la
    // que un pago cambia de estado: el redirect del navegador no cuenta. Es
    // idempotente en dos niveles: acá (si ya está en el estado entrante, no-op) y
    // en la transacción del repositorio (guarda updateMany where estado=PENDIENTE).
    async procesarNotificacion(payload) {
      const interpretada = pasarela.interpretarNotificacion(payload)
      if (!interpretada) {
        return { procesado: false, motivo: 'NOTIFICACION_INVALIDA' }
      }

      const pago = await repositorio.buscarPorReferencia(interpretada.referenciaExterna)
      if (!pago) {
        return { procesado: false, motivo: 'PAGO_NO_ENCONTRADO' }
      }

      // Ya está en el estado entrante: la misma notificación llegó de nuevo.
      if (pago.estado === interpretada.estado) {
        return { procesado: true, idempotente: true }
      }
      // Solo transiciones legales desde PENDIENTE (aprobar o rechazar).
      if (!esTransicionPagoValida(pago.estado, interpretada.estado)) {
        return { procesado: false, motivo: 'TRANSICION_INVALIDA' }
      }

      if (interpretada.estado === 'APROBADO') {
        const resultado = await repositorio.aprobarPagoTransaccional(pago.id)
        return { procesado: true, estado: 'APROBADO', ...resultado }
      }

      const resultado = await repositorio.rechazarPagoTransaccional(pago.id)
      return { procesado: true, estado: 'RECHAZADO', ...resultado }
    },
  }
}

const servicioPagos = crearServicioPagos()

export const iniciarPago = (pedidoId) => servicioPagos.iniciarPago(pedidoId)
export const procesarNotificacion = (payload) => servicioPagos.procesarNotificacion(payload)
