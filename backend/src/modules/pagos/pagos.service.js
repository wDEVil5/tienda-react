import { repositorioPagos } from './pagos.repository.js'
import { crearPasarelaFalsa } from './pagos.pasarela.js'
import { crearPasarelaMercadoPago } from './pagos.pasarela.mercadopago.js'
import { esTransicionPagoValida } from './pagos.estados.js'
import { notificadorPedidos } from '../pedidos/pedidos.notificaciones.js'

// Selección de pasarela por entorno: si hay access token de Mercado Pago se usa
// la real; si no, la falsa (dev/tests). Mismo criterio que el transporte de correo.
function pasarelaPorDefecto() {
  if (process.env.MP_ACCESS_TOKEN) {
    return crearPasarelaMercadoPago({ accessToken: process.env.MP_ACCESS_TOKEN })
  }
  return crearPasarelaFalsa()
}

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
  pasarela = pasarelaPorDefecto(),
  notificador = notificadorPedidos,
} = {}) {
  // Aplica un resultado YA RESUELTO ({ referenciaExterna, estado }) al pago que le
  // corresponde. Idempotente en dos niveles (aquí + la tx del repositorio). Lo
  // comparten el webhook y la reconciliación del retorno: ambos terminan aquí, así
  // que el efecto sobre stock/pedido/correo es exactamente el mismo por una sola vía.
  async function aplicarResultado(interpretada) {
    const pago = await repositorio.buscarPorReferencia(interpretada.referenciaExterna)
    if (!pago) {
      return { procesado: false, motivo: 'PAGO_NO_ENCONTRADO' }
    }

    // Ya está en el estado entrante: la misma resolución llegó de nuevo.
    if (pago.estado === interpretada.estado) {
      return { procesado: true, idempotente: true }
    }
    // Solo transiciones legales desde PENDIENTE (aprobar o rechazar).
    if (!esTransicionPagoValida(pago.estado, interpretada.estado)) {
      return { procesado: false, motivo: 'TRANSICION_INVALIDA' }
    }

    if (interpretada.estado === 'APROBADO') {
      const resultado = await repositorio.aprobarPagoTransaccional(pago.id)

      // La confirmación por correo sale AQUÍ, no al crear el pedido: solo si el
      // pago quedó aprobado y el pedido avanzó (consumido). Fire-and-forget para
      // no bloquear la respuesta; la idempotencia de `consumido` evita duplicados.
      if (resultado.consumido && resultado.pedido) {
        notificador
          .enviarConfirmacion(resultado.pedido)
          .catch((error) =>
            console.error(
              `No se pudo enviar la confirmación del pedido ${resultado.pedido.numero}: ${error.message}`,
            ),
          )
      }

      // El pedido completo no debe viajar en la respuesta.
      delete resultado.pedido
      return { procesado: true, estado: 'APROBADO', ...resultado }
    }

    const resultado = await repositorio.rechazarPagoTransaccional(pago.id)
    return { procesado: true, estado: 'RECHAZADO', ...resultado }
  }

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

    async obtenerEstadoParaCheckout(pagoId) {
      return repositorio.obtenerEstadoParaCheckout(pagoId)
    },

    // Procesa una notificación del proveedor (webhook). Traduce el payload a
    // { referenciaExterna, estado } y lo aplica por el camino común.
    async procesarNotificacion(payload) {
      const interpretada = await pasarela.interpretarNotificacion(payload)
      if (!interpretada) {
        return { procesado: false, motivo: 'NOTIFICACION_INVALIDA' }
      }
      return aplicarResultado(interpretada)
    },

    // Reconciliación al volver del checkout: en vez de solo esperar el webhook,
    // le preguntamos a la pasarela el estado real del pago (por nuestra
    // referenciaExterna) y lo aplicamos. Cubre webhooks atrasados o perdidos. Es
    // idempotente: si el webhook ya lo resolvió, no hace nada de nuevo.
    async reconciliarPago(pagoId) {
      const pago = await repositorio.obtenerReferenciaYEstado(pagoId)
      if (!pago) {
        return { procesado: false, motivo: 'PAGO_NO_ENCONTRADO' }
      }
      // Ya resolvió (lo confirmó el webhook u otra reconciliación): nada que hacer.
      if (pago.estado !== 'PENDIENTE') {
        return { procesado: true, idempotente: true, estado: pago.estado }
      }
      if (!pago.referenciaExterna) {
        return { procesado: false, motivo: 'SIN_REFERENCIA' }
      }
      // La pasarela falsa no soporta consulta: no hay nada que reconciliar.
      if (typeof pasarela.consultarPorReferencia !== 'function') {
        return { procesado: false, motivo: 'NO_SOPORTADO' }
      }

      const interpretada = await pasarela.consultarPorReferencia(pago.referenciaExterna)
      if (!interpretada) {
        return { procesado: false, motivo: 'SIN_RESULTADO' }
      }
      return aplicarResultado(interpretada)
    },
  }
}

const servicioPagos = crearServicioPagos()

export const iniciarPago = (pedidoId) => servicioPagos.iniciarPago(pedidoId)
export const obtenerEstadoParaCheckout = (pagoId) => servicioPagos.obtenerEstadoParaCheckout(pagoId)
export const procesarNotificacion = (payload) => servicioPagos.procesarNotificacion(payload)
export const reconciliarPago = (pagoId) => servicioPagos.reconciliarPago(pagoId)
