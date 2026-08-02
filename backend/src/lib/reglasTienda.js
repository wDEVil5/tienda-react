import { normalizarTextoBusqueda } from './texto.js'

// Reglas comerciales de la tienda. Hoy viven como constantes; en la Fase 5
// (panel del dueño) migrarán a una tabla editable. Mantener la forma de estas
// exportaciones vuelve ese cambio barato: el servicio de pedidos solo llama a
// las funciones, nunca lee la fuente. Ver la captura "Reglas de la tienda"
// (turno 7 del handoff de diseño).

// Sobre este monto (CLP) el despacho es gratis.
export const ENVIO_GRATIS_DESDE = 20000

// Tarifa que se aplica cuando la comuna no está en la tabla.
export const TARIFA_BASE = 2990

// Corte y preparación del retiro en tienda. Se usarán para decidir si un pedido
// "se retira hoy"; el pedido en sí no persiste estos valores.
export const CORTE_RETIRO_HOY = '19:00'
export const PREPARACION_HORAS = 2

// Tarifas de despacho por comuna. Las claves van normalizadas (sin tildes, en
// minúsculas) para poder buscarlas desde el nombre tal como lo escribe el
// comprador ("Ñuñoa", "LAS CONDES", ...).
export const TARIFAS_COMUNA = {
  providencia: { tarifa: 2990, plazoHoras: 24 },
  nunoa: { tarifa: 2990, plazoHoras: 24 },
  'las condes': { tarifa: 3990, plazoHoras: 48 },
  maipu: { tarifa: 4990, plazoHoras: 48 },
}

/**
 * Devuelve la tarifa y el plazo de una comuna. Si la comuna no está en la
 * tabla, cae en la tarifa base (el plazo queda en null: se confirma al despachar).
 * @param {string} comuna - Nombre de la comuna tal como llega del checkout.
 */
export function tarifaDespachoPorComuna(comuna) {
  const clave = normalizarTextoBusqueda(comuna ?? '')
  return TARIFAS_COMUNA[clave] ?? { tarifa: TARIFA_BASE, plazoHoras: null }
}

/**
 * Calcula el costo de envío (CLP entero) de un pedido.
 * - RETIRO: siempre gratis.
 * - DESPACHO: gratis desde ENVIO_GRATIS_DESDE; si no, la tarifa de la comuna.
 * El subtotal llega ya calculado por el servidor, nunca desde el cliente.
 * @param {{ modalidad: string, comuna?: string, subtotal: number }} datos
 */
export function calcularCostoEnvio({ modalidad, comuna, subtotal }) {
  if (modalidad === 'RETIRO') {
    return 0
  }

  if (modalidad === 'DESPACHO') {
    if (subtotal >= ENVIO_GRATIS_DESDE) {
      return 0
    }
    return tarifaDespachoPorComuna(comuna).tarifa
  }

  // Falla ruidosamente en vez de asumir "gratis" ante un valor inesperado.
  throw new Error(`Modalidad de entrega desconocida: ${modalidad}`)
}

/**
 * Forma pública de las reglas comerciales, para que el frontend no las duplique
 * (barra "te faltan $X para envío gratis", tarifas por comuna, corte de retiro).
 * Es la fuente de verdad: cambia el valor aquí y la UI lo refleja vía
 * `GET /api/reglas`. Las tarifas se entregan como lista para ser serializables.
 */
export function reglasPublicas() {
  return {
    envioGratisDesde: ENVIO_GRATIS_DESDE,
    tarifaBase: TARIFA_BASE,
    corteRetiroHoy: CORTE_RETIRO_HOY,
    preparacionHoras: PREPARACION_HORAS,
    tarifasComuna: Object.entries(TARIFAS_COMUNA).map(([comuna, valor]) => ({
      comuna,
      ...valor,
    })),
  }
}
