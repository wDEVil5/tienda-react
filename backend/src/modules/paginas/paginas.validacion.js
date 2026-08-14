import { z } from 'zod'

// Contrato para GUARDAR una página (PUT admin). El slug NO va en el body: llega
// por la URL y se valida contra el conjunto canónico en el servicio. El cuerpo es
// Markdown; el tope evita payloads absurdos (una página no es un libro).
export const esquemaPagina = z
  .object({
    titulo: z.string().trim().min(2).max(160),
    cuerpo: z.string().max(50000),
    publicada: z.boolean(),
  })
  .strict()

export function validarPagina(datos) {
  return esquemaPagina.safeParse(datos)
}
