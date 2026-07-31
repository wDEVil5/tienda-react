import {
  normalizarProductoApi,
  normalizarProductoFakeStore,
} from "../data/producto.js";

const URL_FAKE_STORE = "https://fakestoreapi.com/products";

/**
 * Obtiene el catálogo sin exponer a la UI cuál es la fuente de datos.
 *
 * En local, VITE_API_URL apunta a la API propia. La demo de GitHub Pages no
 * tiene backend desplegado todavía, por eso conserva Fake Store como respaldo
 * temporal. Cuando la API se publique, este fallback se podrá retirar aquí.
 */
export async function obtenerProductos({
  fetchImpl = fetch,
  // Vite reemplaza estas variables al compilar. Solo usamos la URL local en
  // desarrollo: el bundle de GitHub Pages debe iniciar directamente con el
  // respaldo hasta que exista una API pública.
  apiUrl = import.meta.env.DEV ? import.meta.env.VITE_API_URL : undefined,
  orden = "relevancia",
  busqueda = "",
  categoria,
} = {}) {
  if (apiUrl) {
    try {
      const parametros = new URLSearchParams({ limit: "24", orden });
      const termino = busqueda.trim();

      if (termino) {
        parametros.set("q", termino);
      }

      if (categoria) {
        parametros.set("categoria", categoria);
      }

      const respuestaApi = await fetchImpl(
        `${apiUrl.replace(/\/$/, "")}/productos?${parametros}`,
      );

      if (!respuestaApi.ok) {
        throw new Error("La API propia no respondió correctamente.");
      }

      const cuerpo = await respuestaApi.json();

      if (!Array.isArray(cuerpo.data)) {
        throw new Error("La API propia devolvió un catálogo inválido.");
      }

      return cuerpo.data.map(normalizarProductoApi);
    } catch {
      // El respaldo permite seguir desarrollando el frontend si la API local
      // está detenida. No se muestra este detalle al cliente final.
    }
  }

  const respuestaFakeStore = await fetchImpl(URL_FAKE_STORE);

  if (!respuestaFakeStore.ok) {
    throw new Error("No se pudo cargar el catálogo.");
  }

  const productos = await respuestaFakeStore.json();

  if (!Array.isArray(productos)) {
    throw new Error("Fake Store devolvió un catálogo inválido.");
  }

  return productos.map(normalizarProductoFakeStore);
}
