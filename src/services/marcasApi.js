// Logo API de Brandfetch: el Client ID identifica la integración y se usa en
// una URL pública de imagen. La API key de Brandfetch nunca llega al frontend.
export function crearUrlLogoBrandfetch(dominio, clientId = import.meta.env.VITE_BRANDFETCH_CLIENT_ID) {
  if (!dominio || !clientId) return null;
  return `https://cdn.brandfetch.io/${encodeURIComponent(dominio)}/logo?c=${encodeURIComponent(clientId)}`;
}

// Marcas es contenido complementario del Home. Si la API está dormida no
// inventamos marcas ni logo locales: el carrusel simplemente se oculta.
export async function obtenerMarcas({
  fetchImpl = fetch,
  apiUrl = import.meta.env.VITE_API_URL,
} = {}) {
  if (!apiUrl) return null;

  try {
    const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/marcas`);
    if (!respuesta.ok) return null;

    const datos = await respuesta.json();
    return Array.isArray(datos?.data) ? datos.data : null;
  } catch {
    return null;
  }
}
