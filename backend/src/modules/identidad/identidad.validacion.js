import { z } from 'zod'

// Contrato de entrada para GUARDAR la identidad (PUT admin). El panel envía el
// formulario completo. Los campos opcionales (whatsapp, redes) llegan como ""
// cuando el dueño los borra; se normalizan a null antes de validar el largo.
function opcional(max) {
  return z.preprocess(
    (valor) => {
      if (valor == null) return null
      const texto = String(valor).trim()
      return texto === '' ? null : texto
    },
    z.string().max(max).nullable(),
  )
}

export const esquemaIdentidad = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    telefono: z.string().trim().min(3).max(40),
    direccion: z.string().trim().min(3).max(200),
    horarioAtencion: z.string().trim().min(2).max(120),
    whatsapp: opcional(40),
    instagram: opcional(255),
    facebook: opcional(255),
    tiktok: opcional(255),
  })
  .strict()

export function validarIdentidad(datos) {
  return esquemaIdentidad.safeParse(datos)
}
