// Estado de stock derivado para el catálogo público. Son funciones puras: la
// regla se prueba sin base de datos y se reutiliza en cualquier DTO.

export const ESTADO_STOCK = {
  AGOTADO: 'AGOTADO',
  ULTIMAS_UNIDADES: 'ULTIMAS_UNIDADES',
  DISPONIBLE: 'DISPONIBLE',
}

// Lo que un comprador puede comprar ahora, nunca negativo. Las unidades
// reservadas por pedidos pendientes no cuentan como disponibles: así el catálogo
// no ofrece unidades que otro carrito ya tiene tomadas.
export function calcularDisponible({ stock = 0, stockReservado = 0 } = {}) {
  return Math.max(0, stock - stockReservado)
}

// alertaStockBajo es el umbral por producto para "últimas unidades". Si el
// producto no define umbral, no existe ese estado intermedio: o hay disponible
// o está agotado.
export function calcularEstadoStock({
  stock = 0,
  stockReservado = 0,
  alertaStockBajo = null,
} = {}) {
  const disponible = calcularDisponible({ stock, stockReservado })

  if (disponible <= 0) {
    return ESTADO_STOCK.AGOTADO
  }

  if (alertaStockBajo != null && disponible <= alertaStockBajo) {
    return ESTADO_STOCK.ULTIMAS_UNIDADES
  }

  return ESTADO_STOCK.DISPONIBLE
}
