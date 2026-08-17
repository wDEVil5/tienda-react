// Cliente de la lista de deseos (favoritos). Como el resto de la cuenta, siempre
// requiere la API propia y envía la cookie httpOnly cross-site.
const apiUrlPorDefecto = () => import.meta.env.VITE_API_URL;

export class ErrorFavoritosApi extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function solicitar(
  ruta,
  { method = "GET", fetchImpl = fetch, apiUrl = apiUrlPorDefecto() } = {},
) {
  if (!apiUrl) {
    throw new ErrorFavoritosApi("Los favoritos requieren la API propia.", {
      code: "API_UNAVAILABLE",
    });
  }

  const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}${ruta}`, {
    method,
    credentials: "include",
  });

  // 204 (agregar/quitar) no trae cuerpo; el .catch cubre ese caso.
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorFavoritosApi(
      datos?.error?.message ?? "No pudimos actualizar tus favoritos.",
      { code: datos?.error?.code, status: respuesta.status },
    );
  }
  return datos;
}

// Tarjetas completas + ids de la página "Favoritos".
export async function obtenerFavoritos(opciones = {}) {
  const cuerpo = await solicitar("/cuenta/favoritos", opciones);
  return { data: cuerpo?.data ?? [], ids: cuerpo?.ids ?? [] };
}

// Solo los ids: barato, para hidratar el estado de los corazones al cargar.
export async function obtenerFavoritosIds(opciones = {}) {
  const cuerpo = await solicitar("/cuenta/favoritos/ids", opciones);
  return cuerpo?.data ?? [];
}

export function agregarFavorito(productoId, opciones = {}) {
  return solicitar(`/cuenta/favoritos/${encodeURIComponent(productoId)}`, {
    ...opciones,
    method: "PUT",
  });
}

export function quitarFavorito(productoId, opciones = {}) {
  return solicitar(`/cuenta/favoritos/${encodeURIComponent(productoId)}`, {
    ...opciones,
    method: "DELETE",
  });
}
