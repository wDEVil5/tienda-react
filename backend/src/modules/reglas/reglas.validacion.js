import { z } from 'zod'
import { normalizarTextoBusqueda } from '../../lib/texto.js'

// Contrato de entrada para GUARDAR las reglas de la tienda (PUT admin). El panel
// envía el formulario completo; por eso se valida todo junto. Montos en CLP como
// enteros no negativos; el corte de retiro en formato "HH:MM" (24h).

const horaHHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const esquemaTarifa = z
  .object({
    nombre: z.string().trim().min(2).max(80),
    tarifa: z.number().int().min(0).max(1_000_000),
    // Plazo de entrega en horas; null = "se confirma al despachar".
    plazoHoras: z.number().int().min(0).max(720).nullable().optional(),
  })
  .strict()

export const esquemaReglas = z
  .object({
    envioGratisDesde: z.number().int().min(0).max(100_000_000),
    tarifaBase: z.number().int().min(0).max(1_000_000),
    corteRetiroHoy: z
      .string()
      .trim()
      .regex(horaHHMM, 'Usa el formato HH:MM (24h).'),
    preparacionHoras: z.number().int().min(0).max(240),
    tarifasComuna: z
      .array(esquemaTarifa)
      .max(200)
      // La comuna se guarda con clave normalizada; dos nombres que normalizan
      // igual ("Ñuñoa" y "nunoa") chocarían con el @unique. Se rechaza acá con un
      // mensaje claro en vez de dejar caer un error de base de datos.
      .refine(
        (tarifas) =>
          new Set(tarifas.map((t) => normalizarTextoBusqueda(t.nombre))).size ===
          tarifas.length,
        'Hay comunas repetidas.',
      ),
  })
  .strict()

export function validarReglas(datos) {
  return esquemaReglas.safeParse(datos)
}
