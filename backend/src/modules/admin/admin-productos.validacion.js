import { z } from 'zod'

const uuid = z.string().uuid()
const textoOpcional = (maximo) => z.string().trim().min(1).max(maximo).nullable().optional()

// PATCH acepta solo cambios explícitos. El campo nombreBusqueda queda fuera:
// se deriva siempre del nombre en el servicio, no desde el panel.
export const esquemaCambiosProductoAdmin = z.object({
  nombre: z.string().trim().min(3).max(200).optional(),
  sku: z.string().trim().min(3).max(80).optional(),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  descripcion: z.string().trim().min(1).max(10_000).optional(),
  precio: z.number().int().nonnegative().optional(),
  precioAnterior: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().optional(),
  activo: z.boolean().optional(),
  destacado: z.boolean().optional(),
  alertaStockBajo: z.number().int().positive().nullable().optional(),
  codigoBarras: textoOpcional(50),
  origen: textoOpcional(120),
  contenidoCantidad: z.number().positive().max(1_000_000).nullable().optional(),
  contenidoUnidad: textoOpcional(20),
  pesoDespachoGramos: z.number().int().positive().nullable().optional(),
  fechaVencimiento: z.string().date().nullable().optional(),
  categoriaId: uuid.optional(),
  marcaId: uuid.optional(),
  etiquetaIds: z.array(uuid).max(10).refine(
    (ids) => new Set(ids).size === ids.length,
    'etiquetaIds no puede repetir etiquetas.',
  ).optional(),
}).strict().refine(
  (cambios) => Object.keys(cambios).length > 0,
  {
    message: 'Debes enviar al menos un cambio.',
  },
).refine(
  (cambios) =>
    cambios.precioAnterior === undefined ||
    cambios.precioAnterior === null ||
    cambios.precio === undefined ||
    cambios.precioAnterior > cambios.precio,
  {
    message: 'precioAnterior debe ser mayor que precio cuando ambos se actualizan.',
    path: ['precioAnterior'],
  },
)

export function validarCambiosProductoAdmin(cambios) {
  return esquemaCambiosProductoAdmin.safeParse(cambios)
}

const esquemaProductoNuevoAdmin = z.object({
  nombre: z.string().trim().min(3).max(200),
  sku: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  descripcion: z.string().trim().min(1).max(10_000),
  precio: z.number().int().nonnegative(),
  precioAnterior: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(),
  destacado: z.boolean().optional(),
  alertaStockBajo: z.number().int().positive().nullable().optional(),
  codigoBarras: textoOpcional(50),
  origen: textoOpcional(120),
  contenidoCantidad: z.number().positive().max(1_000_000).nullable().optional(),
  contenidoUnidad: textoOpcional(20),
  pesoDespachoGramos: z.number().int().positive().nullable().optional(),
  fechaVencimiento: z.string().date().nullable().optional(),
  categoriaId: uuid,
  marcaId: uuid,
  etiquetaIds: z.array(uuid).max(10).refine(
    (ids) => new Set(ids).size === ids.length,
    'etiquetaIds no puede repetir etiquetas.',
  ).optional(),
}).strict().refine(
  (producto) =>
    producto.precioAnterior === undefined ||
    producto.precioAnterior === null ||
    producto.precioAnterior > producto.precio,
  {
    message: 'precioAnterior debe ser mayor que precio.',
    path: ['precioAnterior'],
  },
)

export function validarProductoNuevoAdmin(producto) {
  return esquemaProductoNuevoAdmin.safeParse(producto)
}
