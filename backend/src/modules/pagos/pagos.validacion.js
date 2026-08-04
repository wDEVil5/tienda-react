import { z } from 'zod'

// Iniciar el pago de un pedido: solo necesita el id del pedido. El monto no
// viene del cliente — lo pone el servidor desde el total del pedido.
export const esquemaIniciarPago = z
  .object({
    pedidoId: z.string().uuid(),
  })
  .strict()

export function validarIniciarPago(datos) {
  return esquemaIniciarPago.safeParse(datos)
}
