import { z } from 'zod'

// Fecha opcional: el editor manda "" al vaciar el campo → null. Un valor ISO se
// convierte a Date; null pasa tal cual.
const fechaOpcional = z.preprocess(
  (valor) => (valor === '' || valor == null ? null : valor),
  z.coerce.date().nullable(),
)

// Enlace opcional: acepta URL externa o ruta interna ("/#catalogo"); "" → null.
const enlaceOpcional = z.preprocess(
  (valor) => {
    if (valor == null) return null
    const texto = String(valor).trim()
    return texto === '' ? null : texto
  },
  z.string().max(500).nullable(),
)

// Crear: la imagen (imagenUrl + storageKey) ya se subió aparte y llega en el body.
export const esquemaBannerNuevo = z
  .object({
    titulo: z.string().trim().min(2).max(160),
    imagenUrl: z.string().url().max(600),
    storageKey: z.string().max(255).nullable().optional(),
    enlace: enlaceOpcional.optional(),
    orden: z.number().int().min(0).max(9999).optional(),
    activo: z.boolean().optional(),
    empiezaEn: fechaOpcional.optional(),
    terminaEn: fechaOpcional.optional(),
  })
  .strict()

// Actualizar: todo opcional (edición parcial).
export const esquemaBannerCambios = z
  .object({
    titulo: z.string().trim().min(2).max(160).optional(),
    imagenUrl: z.string().url().max(600).optional(),
    storageKey: z.string().max(255).nullable().optional(),
    enlace: enlaceOpcional.optional(),
    orden: z.number().int().min(0).max(9999).optional(),
    activo: z.boolean().optional(),
    empiezaEn: fechaOpcional.optional(),
    terminaEn: fechaOpcional.optional(),
  })
  .strict()

export function validarBannerNuevo(datos) {
  return esquemaBannerNuevo.safeParse(datos)
}

export function validarBannerCambios(datos) {
  return esquemaBannerCambios.safeParse(datos)
}
