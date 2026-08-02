import { z } from 'zod'

const uuid = z.string().uuid()

export const esquemaPromocionNuevaAdmin = z.object({
  nombre: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  porcentajeDescuento: z.number().int().min(1).max(100),
  empiezaEn: z.string().datetime({ offset: true }),
  terminaEn: z.string().datetime({ offset: true }),
  productoIds: z.array(uuid).min(1).max(100).refine(
    (ids) => new Set(ids).size === ids.length,
    'productoIds no puede repetir productos.',
  ),
}).strict().refine(
  (promocion) => new Date(promocion.empiezaEn) < new Date(promocion.terminaEn),
  { message: 'terminaEn debe ser posterior a empiezaEn.', path: ['terminaEn'] },
)

export function validarPromocionNuevaAdmin(datos) {
  return esquemaPromocionNuevaAdmin.safeParse(datos)
}

export const esquemaCambiosPromocionAdmin = z.object({
  nombre: z.string().trim().min(3).max(120).optional(),
  slug: z.string().trim().min(3).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  porcentajeDescuento: z.number().int().min(1).max(100).optional(),
  empiezaEn: z.string().datetime({ offset: true }).optional(),
  terminaEn: z.string().datetime({ offset: true }).optional(),
  productoIds: z.array(uuid).min(1).max(100).refine(
    (ids) => new Set(ids).size === ids.length,
    'productoIds no puede repetir productos.',
  ).optional(),
}).strict().refine(
  (cambios) => Object.keys(cambios).length > 0,
  { message: 'Debes enviar al menos un cambio.' },
)

export function validarCambiosPromocionAdmin(datos) {
  return esquemaCambiosPromocionAdmin.safeParse(datos)
}
