import { z } from 'zod'

const esquemaImagen = z.object({
  url: z.string().url().max(500),
  storageKey: z.string().trim().min(1).max(300).nullable().optional(),
  textoAlternativo: z.string().trim().min(1).max(255).nullable().optional(),
}).strip()

// El orden se deriva de la posición del arreglo. Esto evita que el panel pueda
// enviar dos imágenes con la misma posición y romper la restricción de la BD.
const esquemaImagenesProductoAdmin = z.object({
  imagenes: z.array(esquemaImagen).min(1).max(5).refine(
    (imagenes) => new Set(imagenes.map((imagen) => imagen.url)).size === imagenes.length,
    'No se puede repetir la misma imagen.',
  ),
}).strip()

export function validarImagenesProductoAdmin(datos) {
  return esquemaImagenesProductoAdmin.safeParse(datos)
}
