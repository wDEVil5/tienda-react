import { createHash, randomBytes } from 'node:crypto'

const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000

// Este valor viaja una sola vez al navegador. PostgreSQL recibe únicamente el
// resultado de hashTokenSesion(), nunca el token original.
export function crearTokenSesion() {
  return randomBytes(32).toString('base64url')
}

export function hashTokenSesion(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function crearVencimientoSesion(ahora = new Date()) {
  return new Date(ahora.getTime() + DURACION_SESION_MS)
}
