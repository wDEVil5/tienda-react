import { z } from 'zod'

// Dirección guardada del cliente. Mismos largos que el esquema de dirección del
// checkout (pedidos.validacion) para que una dirección guardada sea válida al
// comprar. `predeterminada` opcional: solo se usa para marcarla como default (no
// se puede "desmarcar" directo; ver el servicio).
export const esquemaDireccionCliente = z
  .object({
    etiqueta: z.string().trim().min(1).max(60).optional(),
    calle: z.string().trim().min(3).max(200),
    depto: z.string().trim().max(60).optional(),
    comuna: z.string().trim().min(2).max(80),
    region: z.string().trim().min(2).max(80),
    instrucciones: z.string().trim().max(300).optional(),
    predeterminada: z.boolean().optional(),
  })
  .strict()

export function validarDireccionCliente(datos) {
  return esquemaDireccionCliente.safeParse(datos)
}
