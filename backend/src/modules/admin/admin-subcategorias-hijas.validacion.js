import { z } from 'zod'

export const esquemaSubcategoriaHijaNueva = z
  .object({
    nombre: z.string().trim().min(2).max(100),
    orden: z.number().int().min(0).max(9999).optional(),
  })
  .strict()

export const esquemaSubcategoriaHijaCambios = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    orden: z.number().int().min(0).max(9999).optional(),
    activa: z.boolean().optional(),
  })
  .strict()

export const validarSubcategoriaHijaNueva = (datos) => esquemaSubcategoriaHijaNueva.safeParse(datos)
export const validarSubcategoriaHijaCambios = (datos) => esquemaSubcategoriaHijaCambios.safeParse(datos)
