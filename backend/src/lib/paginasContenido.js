// Conjunto CANÓNICO de páginas de contenido. Son las páginas fijas del sitio
// (no slugs libres): el panel muestra estas cuatro para editar y el guardado
// rechaza cualquier slug fuera de la lista. El título aquí es el DEFECTO que ve
// el panel antes de que exista la fila; una vez creada, manda el de la base.

export const PAGINAS_CONTENIDO = [
  { slug: 'nosotros', titulo: 'Sobre nosotros' },
  { slug: 'terminos', titulo: 'Términos de servicio' },
  { slug: 'privacidad', titulo: 'Política de privacidad' },
  { slug: 'faq', titulo: 'Preguntas frecuentes' },
]

export const SLUGS_VALIDOS = PAGINAS_CONTENIDO.map((pagina) => pagina.slug)

export function esSlugValido(slug) {
  return SLUGS_VALIDOS.includes(slug)
}

export function tituloPorDefecto(slug) {
  return PAGINAS_CONTENIDO.find((pagina) => pagina.slug === slug)?.titulo ?? ''
}
