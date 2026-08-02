import argon2 from 'argon2'

// Argon2id dificulta ataques paralelos con GPU. Estos parámetros equilibran
// protección y tiempo de respuesta para el panel administrativo inicial.
const opcionesHash = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
}

export function crearHashContrasena(contrasena) {
  return argon2.hash(contrasena, opcionesHash)
}

export function verificarContrasena(hash, contrasena) {
  return argon2.verify(hash, contrasena)
}
