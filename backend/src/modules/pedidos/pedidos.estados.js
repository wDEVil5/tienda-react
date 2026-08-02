// Máquina de estados del pedido. Las transiciones válidas dependen de la
// modalidad: el flujo de RETIRO pasa por LISTO_PARA_RETIRO y el de DESPACHO por
// ENVIADO. Modelar esto como DATOS (un mapa por modalidad) en vez de condicionales
// sueltos hace explícito el ciclo de vida y fácil de probar. Los strings reflejan
// el enum EstadoPedido / ModalidadEntrega del schema.prisma.

export const ESTADO_INICIAL = 'PENDIENTE'

// Todos los estados posibles (para validar filtros y entradas de la API).
export const ESTADOS_PEDIDO = [
  'PENDIENTE',
  'PREPARANDO',
  'LISTO_PARA_RETIRO',
  'ENVIADO',
  'ENTREGADO',
  'CANCELADO',
]

// Estados finales: no admiten ninguna transición de salida.
export const ESTADOS_TERMINALES = ['ENTREGADO', 'CANCELADO']

// Un flujo por modalidad: para cada estado, la lista de estados a los que puede
// avanzar. CANCELADO es alcanzable desde cualquier estado no terminal.
const FLUJOS = {
  RETIRO: {
    PENDIENTE: ['PREPARANDO', 'CANCELADO'],
    PREPARANDO: ['LISTO_PARA_RETIRO', 'CANCELADO'],
    LISTO_PARA_RETIRO: ['ENTREGADO', 'CANCELADO'],
    ENTREGADO: [],
    CANCELADO: [],
  },
  DESPACHO: {
    PENDIENTE: ['PREPARANDO', 'CANCELADO'],
    PREPARANDO: ['ENVIADO', 'CANCELADO'],
    ENVIADO: ['ENTREGADO', 'CANCELADO'],
    ENTREGADO: [],
    CANCELADO: [],
  },
}

export function esEstadoTerminal(estado) {
  return ESTADOS_TERMINALES.includes(estado)
}

/**
 * Estados a los que un pedido puede avanzar desde `estado`, según su modalidad.
 * Devuelve [] si el estado es terminal o no pertenece al flujo de la modalidad.
 * @param {string} estado
 * @param {string} modalidad
 */
export function transicionesValidas(estado, modalidad) {
  return FLUJOS[modalidad]?.[estado] ?? []
}

/**
 * ¿Se puede pasar de `desde` a `hacia` en un pedido de esa modalidad? El
 * servicio usa esto para rechazar cambios de estado inválidos con un error claro.
 * @param {{ desde: string, hacia: string, modalidad: string }} datos
 */
export function esTransicionValida({ desde, hacia, modalidad }) {
  return transicionesValidas(desde, modalidad).includes(hacia)
}
