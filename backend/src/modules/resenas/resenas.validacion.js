import { z } from 'zod'

// Reseña de un producto: calificación obligatoria (1..5, entero). Título y
// cuerpo opcionales; se recortan y, si quedan vacíos, se guardan como null. El
// productoId identifica el producto reseñado; el clienteId sale SIEMPRE de la
// sesión, nunca del cuerpo.
const textoOpcional = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((valor) => (valor.length > 0 ? valor : null))
    .nullable()
    .optional()

export const esquemaResena = z
  .object({
    productoId: z.string().uuid(),
    calificacion: z.number().int().min(1).max(5),
    titulo: textoOpcional(120),
    cuerpo: textoOpcional(1000),
  })
  .strict()

export function validarResena(datos) {
  return esquemaResena.safeParse(datos)
}
