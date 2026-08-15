// Banners del carrusel de portada. Como las marcas, son contenido editorial: si
// la API está dormida o no hay banners vigentes, devolvemos null y el Home usa
// su alternativa (el hero) en lugar de romperse.
export async function obtenerBanners({
  fetchImpl = fetch,
  apiUrl = import.meta.env.VITE_API_URL,
} = {}) {
  if (!apiUrl) return null;

  try {
    const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/banners`);
    if (!respuesta.ok) return null;

    const datos = await respuesta.json();
    return Array.isArray(datos?.data) ? datos.data : null;
  } catch {
    return null;
  }
}
