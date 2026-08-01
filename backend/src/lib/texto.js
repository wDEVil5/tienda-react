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
