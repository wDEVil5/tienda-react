// Opciones comunes de las cookies de sesión (staff y cliente), en un solo lugar
// para que no diverjan. En producción con el front en OTRO dominio (Cloudflare
// Pages vs Render) la cookie debe viajar cross-site: SameSite=None, que el
// navegador solo acepta junto con Secure. En local sigue en Lax sobre http.
//
// Se activa por entorno (COOKIE_CROSS_SITE=true) para no forzar Secure/None en
// desarrollo, donde no hay HTTPS.
export function opcionesCookieSesion(extra = {}) {
  const crossSite = process.env.COOKIE_CROSS_SITE === 'true'
  const esProduccion = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    path: '/',
    sameSite: crossSite ? 'none' : 'lax',
    // SameSite=None sin Secure lo rechaza el navegador; en producción, además,
    // siempre vamos sobre HTTPS.
    secure: crossSite || esProduccion,
    ...extra,
  }
}
