import { z } from 'zod'

// Contrato de ENTRADA para crear un pedido. Regla de oro: el cliente manda
// QUÉ compra (productos + cantidades) y a dónde, nunca CUÁNTO cuesta. Los
// precios y totales los recalcula el servidor. Por eso .strict() en todos los
// objetos: si llega un campo de más (p. ej. "total"), la validación lo rechaza.

const uuid = z.string().uuid()

const esquemaContacto = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(255),
    telefono: z.string().trim().min(6).max(40),
  })
  .strict()

const esquemaDireccion = z
  .object({
    calle: z.string().trim().min(3).max(200),
    depto: z.string().trim().max(60).optional(),
    comuna: z.string().trim().min(2).max(80),
    region: z.string().trim().min(2).max(80),
    instrucciones: z.string().trim().max(300).optional(),
  })
  .strict()

const esquemaItem = z
  .object({
    productoId: uuid,
    cantidad: z.number().int().min(1).max(99),
  })
  .strict()

export const esquemaPedidoNuevo = z
  .object({
    contacto: esquemaContacto,
    modalidad: z.enum(['RETIRO', 'DESPACHO']),
    direccion: esquemaDireccion.optional(),
    items: z
      .array(esquemaItem)
      .min(1)
      .max(50)
      .refine(
        (items) => new Set(items.map((item) => item.productoId)).size === items.length,
        'No repitas el mismo producto; usa la cantidad.',
      ),
    observaciones: z.string().trim().max(300).optional(),
  })
  .strict()
  // El despacho necesita dirección; el retiro no la lleva. Hacer imposibles los
  // estados ambiguos evita snapshots con dirección "a medias".
  .refine((pedido) => pedido.modalidad !== 'DESPACHO' || pedido.direccion !== undefined, {
    message: 'El despacho requiere una dirección.',
    path: ['direccion'],
  })
  .refine((pedido) => pedido.modalidad !== 'RETIRO' || pedido.direccion === undefined, {
    message: 'El retiro en tienda no lleva dirección.',
    path: ['direccion'],
  })

export function validarPedidoNuevo(datos) {
  return esquemaPedidoNuevo.safeParse(datos)
}
