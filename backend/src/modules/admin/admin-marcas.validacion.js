import { z } from 'zod'

export const esquemaMarcaNuevaAdmin = z.object({
  nombre: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
}).strict()

export function validarMarcaNuevaAdmin(datos) {
  return esquemaMarcaNuevaAdmin.safeParse(datos)
}
