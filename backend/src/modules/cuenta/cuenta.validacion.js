import { z } from 'zod'

// Registro de cliente. La política de contraseña (12–128) coincide con
// contrasena.js; validarla aquí devuelve un 422 claro antes de intentar hashear.
export const esquemaRegistroCliente = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(255),
    contrasena: z.string().min(12).max(128),
    telefono: z.string().trim().min(6).max(40).optional(),
  })
  .strict()

export function validarRegistroCliente(datos) {
  return esquemaRegistroCliente.safeParse(datos)
}

// La identidad de acceso (email) se modifica en un flujo separado con
// verificación del correo nuevo. Este contrato solo permite datos de perfil
// que no cambian cómo el cliente inicia sesión.
export const esquemaActualizacionPerfilCliente = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    telefono: z.string().trim().min(6).max(40).nullable(),
  })
  .strict()

export function validarActualizacionPerfilCliente(datos) {
  return esquemaActualizacionPerfilCliente.safeParse(datos)
}

// La contraseña actual confirma que quien tiene abierta la sesión sigue siendo
// su dueño. La nueva conserva la misma política aplicada en el registro.
export const esquemaCambioContrasenaCliente = z
  .object({
    contrasenaActual: z.string().min(1).max(128),
    contrasenaNueva: z.string().min(12).max(128),
  })
  .strict()
  .refine(
    ({ contrasenaActual, contrasenaNueva }) => contrasenaActual !== contrasenaNueva,
    { path: ['contrasenaNueva'], message: 'La nueva contraseña debe ser distinta.' },
  )

export function validarCambioContrasenaCliente(datos) {
  return esquemaCambioContrasenaCliente.safeParse(datos)
}
