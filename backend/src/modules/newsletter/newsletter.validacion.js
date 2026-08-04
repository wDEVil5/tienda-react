import { z } from 'zod'

// Suscripción al boletín: basta un correo válido. Se normaliza a minúsculas
// igual que en el registro de clientes y en "Avísame", para que el mismo correo
// escrito distinto no genere suscripciones duplicadas.
export const esquemaSuscripcion = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
  })
  .strict()

export function validarSuscripcion(datos) {
  return esquemaSuscripcion.safeParse(datos)
}
