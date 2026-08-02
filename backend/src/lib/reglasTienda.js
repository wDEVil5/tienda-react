import { normalizarTextoBusqueda } from './texto.js'

// Reglas comerciales de la tienda. Desde la Fase 5 son editables por el dueño y
// viven en la base (ConfiguracionTienda + TarifaComuna). Estas constantes son el
// VALOR POR DEFECTO: alimentan el seed y sirven de respaldo si la base aún no
// tiene configuración. Las funciones de cálculo son puras: reciben las reglas
// vigentes por parámetro, no leen la base ni el módulo. Así el servicio decide
// de dónde vienen (base o defaults) y la lógica queda 100% testeable.
// Ver la captura "Reglas de la tienda" (turno 7 del handoff de diseño).

export const REGLAS_POR_DEFECTO = {
  // Sobre este monto (CLP) el despacho es gratis.
  envioGratisDesde: 20000,
  // Tarifa que se aplica cuando la comuna no está en la tabla.
  tarifaBase: 2990,
  // Corte y preparación del retiro en tienda: deciden si un pedido "se retira
  // hoy". El pedido en sí no persiste estos valores.
  corteRetiroHoy: '19:00',
  preparacionHoras: 2,
  // Tarifas de despacho por comuna. `comuna` va normalizada (sin tildes, en
  // minúsculas) para buscarla desde el nombre tal como lo escribe el comprador
  // ("Ñuñoa", "LAS CONDES", ...); `nombre` es el rótulo visible.
  tarifasComuna: [
    { comuna: 'providencia', nombre: 'Providencia', tarifa: 2990, plazoHoras: 24 },
    { comuna: 'nunoa', nombre: 'Ñuñoa', tarifa: 2990, plazoHoras: 24 },
    { comuna: 'las condes', nombre: 'Las Condes', tarifa: 3990, plazoHoras: 48 },
    { comuna: 'maipu', nombre: 'Maipú', tarifa: 4990, plazoHoras: 48 },
  ],
}

/**
 * Devuelve la tarifa y el plazo de una comuna según las reglas vigentes. Si la
 * comuna no está en la tabla, cae en la tarifa base (plazo null: se confirma al
 * despachar).
 * @param {string} comuna - Nombre tal como llega del checkout.
 * @param {typeof REGLAS_POR_DEFECTO} [reglas] - Reglas vigentes (base o defaults).
 */
export function tarifaDespachoPorComuna(comuna, reglas = REGLAS_POR_DEFECTO) {
  const clave = normalizarTextoBusqueda(comuna ?? '')
  const encontrada = reglas.tarifasComuna.find((tarifa) => tarifa.comuna === clave)
  return encontrada ?? { tarifa: reglas.tarifaBase, plazoHoras: null }
}

/**
 * Calcula el costo de envío (CLP entero) de un pedido.
 * - RETIRO: siempre gratis.
 * - DESPACHO: gratis desde `envioGratisDesde`; si no, la tarifa de la comuna.
 * El subtotal llega ya calculado por el servidor, nunca desde el cliente.
 * @param {{ modalidad: string, comuna?: string, subtotal: number }} datos
 * @param {typeof REGLAS_POR_DEFECTO} [reglas] - Reglas vigentes (base o defaults).
 */
export function calcularCostoEnvio({ modalidad, comuna, subtotal }, reglas = REGLAS_POR_DEFECTO) {
  if (modalidad === 'RETIRO') {
    return 0
  }

  if (modalidad === 'DESPACHO') {
    if (subtotal >= reglas.envioGratisDesde) {
      return 0
    }
    return tarifaDespachoPorComuna(comuna, reglas).tarifa
  }

  // Falla ruidosamente en vez de asumir "gratis" ante un valor inesperado.
  throw new Error(`Modalidad de entrega desconocida: ${modalidad}`)
}
