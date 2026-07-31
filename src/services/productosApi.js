import {
  normalizarProductoApi,
  normalizarProductoFakeStore,
} from "../data/producto.js";

const URL_FAKE_STORE = "https://fakestoreapi.com/products";

/**
 * Obtiene una página de catálogo sin exponer a la UI cuál es la fuente de datos.
 *
 * En local, VITE_API_URL apunta a la API propia. La demo de GitHub Pages no
 * tiene backend desplegado todavía, por eso conserva Fake Store como respaldo
 * temporal. Cuando la API se publique, este fallback se podrá retirar aquí.
 */
export async function obtenerCatalogo({
  fetchImpl = fetch,
  // Vite reemplaza estas variables al compilar. Solo usamos la URL local en
  // desarrollo: el bundle de GitHub Pages debe iniciar directamente con el
  // respaldo hasta que exista una API pública.
  apiUrl = import.meta.env.DEV ? import.meta.env.VITE_API_URL : undefined,
  orden = "relevancia",
  busqueda = "",
  categoria,
  soloOfertas = false,
  precioMin,
  precioMax,
  page = 1,
  limit = 10,
} = {}) {
  if (apiUrl) {
    try {
      const parametros = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        orden,
      });
      const termino = busqueda.trim();

      if (termino) {
        parametros.set("q", termino);
      }

      if (categoria) {
        parametros.set("categoria", categoria);
      }

      if (soloOfertas) {
        parametros.set("ofertas", "true");
      }

      if (Number.isFinite(precioMin) && precioMin >= 0) {
        parametros.set("precioMin", String(precioMin));
      }

      if (Number.isFinite(precioMax) && precioMax >= 0) {
        parametros.set("precioMax", String(precioMax));
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

      return {
        productos: cuerpo.data.map(normalizarProductoApi),
        meta: cuerpo.meta,
        fuente: "api",
      };
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

  return {
    productos: productos.map(normalizarProductoFakeStore),
    // Fake Store no pagina en el servidor. Esta metadata permite que el
    // catálogo mantenga su botón local "Cargar más" durante la transición.
    meta: {
      page: 1,
      limit: productos.length,
      total: productos.length,
      totalPages: 1,
    },
    fuente: "fallback",
  };
}

/**
 * Obtiene una ficha por su slug. La ficha no depende de que el producto esté
 * en la página actual del catálogo, por ejemplo tras abrir un enlace directo.
 */
export async function obtenerProductoDetalle({
  slug,
  fetchImpl = fetch,
  apiUrl = import.meta.env.DEV ? import.meta.env.VITE_API_URL : undefined,
} = {}) {
  if (apiUrl) {
    try {
      const respuestaApi = await fetchImpl(
        `${apiUrl.replace(/\/$/, "")}/productos/${encodeURIComponent(slug)}`,
      );

      if (!respuestaApi.ok) {
        throw new Error("La API propia no respondió correctamente.");
      }

      const cuerpo = await respuestaApi.json();

      if (!cuerpo.data) {
        throw new Error("La API propia devolvió una ficha inválida.");
      }

      return normalizarProductoApi(cuerpo.data);
    } catch {
      // La demo pública no tiene endpoint de detalle propio todavía.
    }
  }

  const respuestaFakeStore = await fetchImpl(URL_FAKE_STORE);

  if (!respuestaFakeStore.ok) {
    throw new Error("No se pudo cargar el producto.");
  }

  const productos = await respuestaFakeStore.json();

  if (!Array.isArray(productos)) {
    throw new Error("Fake Store devolvió un catálogo inválido.");
  }

  return (
    productos
      .map(normalizarProductoFakeStore)
      .find((producto) => producto.slug === slug || String(producto.id) === slug) ?? null
  );
}

/**
 * Recupera categorías completas para no depender de la página visible del
 * catálogo. Sin API propia devuelve null y la UI usa su derivación temporal.
 */
export async function obtenerCategorias({
  fetchImpl = fetch,
  apiUrl = import.meta.env.DEV ? import.meta.env.VITE_API_URL : undefined,
} = {}) {
  if (!apiUrl) return null;

  try {
    const respuestaApi = await fetchImpl(
      `${apiUrl.replace(/\/$/, "")}/categorias`,
    );

    if (!respuestaApi.ok) {
      throw new Error("La API propia no respondió correctamente.");
    }

    const cuerpo = await respuestaApi.json();
    return Array.isArray(cuerpo.data) ? cuerpo.data : null;
  } catch {
    return null;
  }
}
