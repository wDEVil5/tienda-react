import { z } from 'zod'

export const esquemaSubcategoriaNueva = z
  .object({
    nombre: z.string().trim().min(2).max(100),
    orden: z.number().int().min(0).max(9999).optional(),
  })
  .strict()

export const esquemaSubcategoriaCambios = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    orden: z.number().int().min(0).max(9999).optional(),
    activa: z.boolean().optional(),
  })
  .strict()

export function validarSubcategoriaNueva(datos) {
  return esquemaSubcategoriaNueva.safeParse(datos)
}

export function validarSubcategoriaCambios(datos) {
  return esquemaSubcategoriaCambios.safeParse(datos)
}
