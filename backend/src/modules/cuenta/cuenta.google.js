import { OAuth2Client } from 'google-auth-library'

// Verifica un ID token de Google (el JWT firmado que el frontend recibe al iniciar
// sesión con Google) contra NUESTRO Client ID: comprueba la firma de Google y que
// el token fue emitido para esta app (audience). Devuelve solo los datos que nos
// interesan, ya normalizados. El cliente de OAuth se inyecta en los tests.
//
// Perezoso a propósito: si falta GOOGLE_CLIENT_ID, recién falla al verificar (no al
// importar el módulo), así los tests que inyectan un verificador falso no dependen
// de la variable de entorno.
export function crearVerificadorGoogle({
  clientId = process.env.GOOGLE_CLIENT_ID,
  oAuthClient,
} = {}) {
  let cliente = oAuthClient

  function obtenerCliente() {
    if (!clientId) {
      throw new Error('Falta GOOGLE_CLIENT_ID para verificar el login con Google.')
    }
    cliente ??= new OAuth2Client(clientId)
    return cliente
  }

  return async function verificar(idToken) {
    const ticket = await obtenerCliente().verifyIdToken({ idToken, audience: clientId })
    const payload = ticket.getPayload()
    return {
      googleId: payload.sub,
      email: (payload.email ?? '').trim().toLowerCase(),
      // Google marca si el correo está verificado en su lado. Solo fusionamos con
      // una cuenta existente si el correo es verificado (si no, alguien podría
      // reclamar el correo ajeno con un token de una cuenta sin verificar).
      emailVerificado: payload.email_verified === true,
      nombre: payload.name?.trim() || payload.email,
    }
  }
}

// Verificador real por defecto, instanciado una sola vez de forma perezosa. Los
// tests del servicio inyectan su propio verificador y no pasan por aquí.
let verificadorSingleton

export function verificadorGooglePorDefecto(idToken) {
  verificadorSingleton ??= crearVerificadorGoogle()
  return verificadorSingleton(idToken)
}
