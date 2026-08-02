import { z } from 'zod'

export const esquemaCategoriaNuevaAdmin = z.object({
  nombre: z.string().trim().min(3).max(100),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
}).strict()

export function validarCategoriaNuevaAdmin(datos) {
  return esquemaCategoriaNuevaAdmin.safeParse(datos)
}
