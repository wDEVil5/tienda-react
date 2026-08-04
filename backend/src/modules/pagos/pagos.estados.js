// Estados de un pago y sus transiciones válidas. Igual que pedidos.estados.js,
// el ciclo de vida se modela como DATOS (funciones puras) para probarlo sin base
// de datos. El estado real lo decide el proveedor vía webhook; aquí solo
// validamos que la transición sea legal, y de eso deriva la idempotencia.

export const ESTADO_INICIAL_PAGO = 'PENDIENTE'

// Todos los estados posibles (para validar entradas y el enum del schema).
export const ESTADOS_PAGO = ['PENDIENTE', 'APROBADO', 'RECHAZADO']

// Estados finales de un intento de pago: una vez aprobado o rechazado, no cambia.
export const ESTADOS_TERMINALES_PAGO = ['APROBADO', 'RECHAZADO']

// Desde PENDIENTE se puede aprobar o rechazar; los terminales no tienen salida.
const TRANSICIONES = {
  PENDIENTE: ['APROBADO', 'RECHAZADO'],
  APROBADO: [],
  RECHAZADO: [],
}

export function esEstadoPagoTerminal(estado) {
  return ESTADOS_TERMINALES_PAGO.includes(estado)
}

/**
 * ¿Se puede pasar de `desde` a `hacia`? El servicio del webhook lo usa para
 * decidir: transición válida → aplica; `hacia === desde` → no-op idempotente
 * (la misma notificación llegó dos veces); cualquier otra → se ignora.
 */
export function esTransicionPagoValida(desde, hacia) {
  return (TRANSICIONES[desde] ?? []).includes(hacia)
}

// Solo la aprobación consume el stock del pedido (la reserva pasa a venta). Lo
// usará el webhook para decidir el efecto sobre el inventario.
export function laAprobacionConsumeStock(estadoPago) {
  return estadoPago === 'APROBADO'
}
