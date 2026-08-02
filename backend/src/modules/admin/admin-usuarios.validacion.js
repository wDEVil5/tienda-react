import { z } from 'zod'

export const esquemaUsuarioNuevoAdmin = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  contrasena: z.string().min(12).max(128).refine(
    (valor) => valor.trim().length > 0,
    'La contraseña no puede estar vacía.',
  ),
}).strict()

export function validarUsuarioNuevoAdmin(datos) {
  return esquemaUsuarioNuevoAdmin.safeParse(datos)
}
