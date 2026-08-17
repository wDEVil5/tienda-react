/**
 * Produce una clave estable para búsquedas sin tildes ni diferencia de mayúsculas.
 * Se guarda junto al nombre del producto para que PostgreSQL pueda consultarla
 * sin cargar todo el catálogo en memoria.
 */
export function normalizarTextoBusqueda(texto) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Colapsa un texto a solo letras y números: sin tildes, minúsculas y SIN
 * separadores (espacios, guiones, puntos). Permite que "campo sur", "Campo-Sur"
 * y "camposur" comparen igual → búsqueda tolerante a la separación.
 */
export function colapsarBusqueda(texto) {
  return normalizarTextoBusqueda(texto).replace(/[^a-z0-9]+/g, '')
}
