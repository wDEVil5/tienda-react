import { z } from 'zod'

// Solicitud del enlace: solo un correo válido. No revela nada por sí sola.
export const esquemaSolicitudRecuperacion = z
  .object({ email: z.string().trim().toLowerCase().email().max(255) })
  .strict()

export function validarSolicitudRecuperacion(datos) {
  return esquemaSolicitudRecuperacion.safeParse(datos)
}

// Restablecer: el token del enlace + la nueva contraseña con la MISMA política
// que el registro (12–128), para no aceptar claves débiles por esta puerta.
export const esquemaRestablecerContrasena = z
  .object({
    token: z.string().min(1).max(512),
    contrasenaNueva: z.string().min(12).max(128),
  })
  .strict()

export function validarRestablecerContrasena(datos) {
  return esquemaRestablecerContrasena.safeParse(datos)
}
