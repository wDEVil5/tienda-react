import { z } from 'zod'

// Suscripción a "Avísame": el frontend conoce el slug del producto agotado y
// pide un correo para notificar. El correo se normaliza (minúsculas) igual que
// en el registro de clientes.
export const esquemaAviso = z
  .object({
    slug: z.string().trim().min(1).max(180),
    email: z.string().trim().toLowerCase().email().max(255),
  })
  .strict()

export function validarAviso(datos) {
  return esquemaAviso.safeParse(datos)
}
