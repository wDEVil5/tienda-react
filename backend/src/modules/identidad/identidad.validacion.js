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

const horaHHMM = /^([01]\d|2[0-3]):[0-5]\d$/

// Un día del horario. Cuando está abierto, la apertura debe ser antes del cierre
// (comparación lexicográfica válida porque el formato es "HH:MM" con cero delante).
const esquemaDia = z
  .object({
    abierto: z.boolean(),
    apertura: z.string().regex(horaHHMM, 'Hora inválida.'),
    cierre: z.string().regex(horaHHMM, 'Hora inválida.'),
  })
  .strict()
  .refine((dia) => !dia.abierto || dia.apertura < dia.cierre, {
    message: 'La apertura debe ser antes del cierre.',
  })

export const esquemaIdentidad = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    telefono: z.string().trim().min(3).max(40),
    direccion: z.string().trim().min(3).max(200),
    // Exactamente 7 días (índice 0 = lunes), como el editor.
    horario: z.array(esquemaDia).length(7),
    whatsapp: opcional(40),
    instagram: opcional(255),
    facebook: opcional(255),
    tiktok: opcional(255),
  })
  .strict()

export function validarIdentidad(datos) {
  return esquemaIdentidad.safeParse(datos)
}
