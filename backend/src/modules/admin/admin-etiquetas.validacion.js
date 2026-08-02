import { z } from 'zod'

export const esquemaEtiquetaNuevaAdmin = z.object({
  nombre: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(70).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
}).strict()

export function validarEtiquetaNuevaAdmin(datos) {
  return esquemaEtiquetaNuevaAdmin.safeParse(datos)
}
