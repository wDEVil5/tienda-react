const QUINCE_MINUTOS_MS = 15 * 60 * 1000

/**
 * Límite local para proteger el login durante el desarrollo y un despliegue
 * de una instancia. En producción con varias instancias se reemplaza por
 * Redis, que comparte los contadores entre servidores.
 */
export function crearLimitadorIntentosLogin({
  maxIntentos = 5,
  ventanaMs = QUINCE_MINUTOS_MS,
  ahora = () => Date.now(),
  obtenerClave = (request) => request.ip,
} = {}) {
  const intentosPorOrigen = new Map()

  return (request, response, next) => {
    const instanteActual = ahora()
    const clave = obtenerClave(request) || 'origen-desconocido'
    const intentoAnterior = intentosPorOrigen.get(clave)

    if (!intentoAnterior || instanteActual - intentoAnterior.inicio >= ventanaMs) {
      intentosPorOrigen.set(clave, { inicio: instanteActual, cantidad: 1 })
      return next()
    }

    if (intentoAnterior.cantidad >= maxIntentos) {
      const segundosRestantes = Math.ceil((ventanaMs - (instanteActual - intentoAnterior.inicio)) / 1000)
      response.setHeader('Retry-After', String(segundosRestantes))
      return response.status(429).json({
        error: {
          code: 'TOO_MANY_LOGIN_ATTEMPTS',
          message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
        },
      })
    }

    intentoAnterior.cantidad += 1
    return next()
  }
}
