import {
  normalizarProductoApi,
  normalizarProductoFakeStore,
} from "../data/producto.js";

const URL_FAKE_STORE = "https://fakestoreapi.com/products";

/**
 * Obtiene una página de catálogo sin exponer a la UI cuál es la fuente de datos.
 *
 * VITE_API_URL apunta a la API propia (local en desarrollo, la desplegada en
 * producción). Fake Store queda como respaldo automático: si la API no responde
 * —p. ej. el backend gratis dormido— el catálogo sigue mostrando algo.
 */
export async function obtenerCatalogo({
  fetchImpl = fetch,
  // Vite reemplaza esta variable al compilar (en producción, con la API
  // desplegada). Si queda vacía o la API falla, el catálogo cae a Fake Store.
  apiUrl = import.meta.env.VITE_API_URL,
  orden = "relevancia",
  busqueda = "",
  categoria,
  subcategoria,
  subcategoriaHija,
  marca = [],
  soloOfertas = false,
  soloDisponibles = false,
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

      if (subcategoria) {
        parametros.set("subcategoria", subcategoria);
      }

      if (subcategoriaHija) {
        parametros.set("subcategoriaHija", subcategoriaHija);
      }

      if (Array.isArray(marca) && marca.length > 0) {
        parametros.set("marca", marca.join(","));
      }

      if (soloOfertas) {
        parametros.set("ofertas", "true");
      }

      if (soloDisponibles) {
        parametros.set("disponibles", "true");
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
  apiUrl = import.meta.env.VITE_API_URL,
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
// Facetas del sidebar del catálogo (marcas disponibles + rango de precio) para el
// contexto actual. Si no hay API propia o falla, devuelve null y el sidebar se
// oculta (Fake Store no tiene facetas reales).
export async function obtenerFacetas({
  categoria,
  subcategoria,
  subcategoriaHija,
  busqueda = "",
  soloOfertas = false,
  soloDisponibles = false,
  fetchImpl = fetch,
  apiUrl = import.meta.env.VITE_API_URL,
} = {}) {
  if (!apiUrl) return null;

  const parametros = new URLSearchParams();
  if (categoria) parametros.set("categoria", categoria);
  if (subcategoria) parametros.set("subcategoria", subcategoria);
  if (subcategoriaHija) parametros.set("subcategoriaHija", subcategoriaHija);
  if (busqueda.trim()) parametros.set("q", busqueda.trim());
  if (soloOfertas) parametros.set("ofertas", "true");
  if (soloDisponibles) parametros.set("disponibles", "true");

  try {
    const respuesta = await fetchImpl(
      `${apiUrl.replace(/\/$/, "")}/productos/facetas?${parametros}`,
    );
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return datos?.data ?? null;
  } catch {
    return null;
  }
}

export async function obtenerCategorias({
  fetchImpl = fetch,
  apiUrl = import.meta.env.VITE_API_URL,
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
