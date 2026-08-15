import { z } from 'zod'

const tipo = z.enum(['SELECCION', 'BOOLEAN'])

export const validarAtributoNuevo = (datos) => z.object({
  nombre: z.string().trim().min(2).max(80), tipo: tipo.optional(), orden: z.number().int().min(0).max(9999).optional(),
}).strict().safeParse(datos)

export const validarAtributoCambios = (datos) => z.object({
  nombre: z.string().trim().min(2).max(80).optional(), tipo: tipo.optional(), orden: z.number().int().min(0).max(9999).optional(), activo: z.boolean().optional(),
}).strict().safeParse(datos)

export const validarOpcionAtributoNueva = (datos) => z.object({
  nombre: z.string().trim().min(2).max(80), orden: z.number().int().min(0).max(9999).optional(),
}).strict().safeParse(datos)

export const validarOpcionAtributoCambios = (datos) => z.object({
  nombre: z.string().trim().min(2).max(80).optional(), orden: z.number().int().min(0).max(9999).optional(), activa: z.boolean().optional(),
}).strict().safeParse(datos)
