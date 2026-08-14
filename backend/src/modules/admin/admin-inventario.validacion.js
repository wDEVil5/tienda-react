import { z } from 'zod'

export const MOTIVOS_MOVIMIENTO = ['ENTRADA', 'MERMA', 'CONTEO']

// Ajuste manual de stock. `delta` es la variación (entero no-cero); el signo lo
// pone el frontend (ENTRADA +, MERMA −, CONTEO ±). El tope evita typos absurdos.
// La coherencia signo↔motivo y el "stock no negativo" los valida el servicio,
// que es quien conoce el stock actual.
export const esquemaAjusteStock = z
  .object({
    delta: z.number().int().refine((valor) => valor !== 0, {
      message: 'delta no puede ser 0',
    }).refine((valor) => Math.abs(valor) <= 100000, {
      message: 'delta fuera de rango',
    }),
    motivo: z.enum(MOTIVOS_MOVIMIENTO),
    nota: z.string().trim().max(300).optional(),
  })
  .strict()

export function validarAjusteStock(datos) {
  return esquemaAjusteStock.safeParse(datos)
}
