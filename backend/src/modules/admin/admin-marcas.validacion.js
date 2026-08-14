import { z } from 'zod'

const dominioBrandfetch = z.string().trim().toLowerCase().max(253)
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)

export const esquemaMarcaNuevaAdmin = z.object({
  nombre: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  // Brandfetch identifica cada marca por su dominio público; no guardamos la
  // URL completa ni la API key. Ej.: "nestle.com".
  brandfetchDomain: dominioBrandfetch.optional(),
}).strict()

// PATCH permite limpiar el dominio con null: el fallback de texto volverá a
// aparecer en el carrusel sin eliminar la marca ni sus productos.
export const esquemaDominioBrandfetchAdmin = z.object({
  brandfetchDomain: dominioBrandfetch.nullable(),
}).strict()

export function validarMarcaNuevaAdmin(datos) {
  return esquemaMarcaNuevaAdmin.safeParse(datos)
}

export function validarDominioBrandfetchAdmin(datos) {
  return esquemaDominioBrandfetchAdmin.safeParse(datos)
}
