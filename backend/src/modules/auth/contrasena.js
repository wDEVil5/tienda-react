import argon2 from 'argon2'

const LONGITUD_MINIMA = 12
const LONGITUD_MAXIMA = 128

// Argon2id dificulta ataques paralelos con GPU. Estos parámetros equilibran
// protección y tiempo de respuesta para el panel administrativo inicial.
const opcionesHash = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
}

export function crearHashContrasena(contrasena) {
  validarContrasenaNueva(contrasena)
  return argon2.hash(contrasena, opcionesHash)
}

export function verificarContrasena(hash, contrasena) {
  return argon2.verify(hash, contrasena)
}

/**
 * La política favorece frases de paso largas. Exigir combinaciones fijas de
 * símbolos suele producir claves predecibles; el hash Argon2id protege luego
 * la contraseña almacenada sin conservarla en texto plano.
 */
export function validarContrasenaNueva(contrasena) {
  if (typeof contrasena !== 'string') {
    throw new Error('La contraseña debe ser texto.')
  }
  if (contrasena.length < LONGITUD_MINIMA || contrasena.length > LONGITUD_MAXIMA) {
    throw new Error(
      `La contraseña debe tener entre ${LONGITUD_MINIMA} y ${LONGITUD_MAXIMA} caracteres.`,
    )
  }
  if (contrasena.trim().length === 0) {
    throw new Error('La contraseña no puede estar vacía.')
  }
}
