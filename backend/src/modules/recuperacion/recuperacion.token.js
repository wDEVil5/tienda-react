import { createHash, randomBytes } from 'node:crypto'

// Igual que las sesiones: el token viaja UNA sola vez en el enlace del correo;
// la base recibe únicamente su hash SHA-256 (64 hex). Vencimiento corto para
// acotar la ventana si el correo se intercepta.
const TTL_MINUTOS_POR_DEFECTO = 60

// Este valor viaja al navegador dentro del enlace del correo. La base guarda
// solo hashTokenRecuperacion(), nunca el token original.
export function crearTokenRecuperacion() {
  return randomBytes(32).toString('base64url')
}

export function hashTokenRecuperacion(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function crearVencimientoRecuperacion(ahora = new Date(), minutos = TTL_MINUTOS_POR_DEFECTO) {
  return new Date(ahora.getTime() + minutos * 60 * 1000)
}
