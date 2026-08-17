// Cliente de reseñas. La lista es pública; crear/editar/borrar envían la cookie
// de sesión (solo quien compró puede reseñar, lo valida el backend).
const apiUrlPorDefecto = () => import.meta.env.VITE_API_URL;

export class ErrorResenasApi extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function solicitar(
  ruta,
  { method = "GET", cuerpo, fetchImpl = fetch, apiUrl = apiUrlPorDefecto() } = {},
) {
  if (!apiUrl) {
    throw new ErrorResenasApi("Las reseñas requieren la API propia.", { code: "API_UNAVAILABLE" });
  }

  const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}${ruta}`, {
    method,
    credentials: "include",
    ...(cuerpo
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }
      : {}),
  });

  const datos = await respuesta.json().catch(() => null); // 204 sin cuerpo
  if (!respuesta.ok) {
    throw new ErrorResenasApi(datos?.error?.message ?? "No pudimos procesar la reseña.", {
      code: datos?.error?.code,
      status: respuesta.status,
    });
  }
  return datos;
}

// Lista paginada + agregado (promedio, conteo). Devuelve { data, meta }.
export async function obtenerResenas({ productoId, page = 1, limit = 10, orden = "reciente", ...opciones } = {}) {
  const parametros = new URLSearchParams({ productoId, page: String(page), limit: String(limit), orden });
  const cuerpo = await solicitar(`/resenas?${parametros}`, opciones);
  return { data: cuerpo?.data ?? [], meta: cuerpo?.meta ?? null };
}

// Elegibilidad del cliente + su reseña (para el formulario "Calificar producto").
export async function obtenerMiResena({ productoId, ...opciones } = {}) {
  const cuerpo = await solicitar(`/resenas/mia?productoId=${encodeURIComponent(productoId)}`, opciones);
  return cuerpo?.data ?? { puedeResenar: false, resena: null };
}

// Crea o edita la reseña del cliente (upsert en el backend).
export async function guardarResena({ productoId, calificacion, titulo, cuerpo, ...opciones } = {}) {
  const respuesta = await solicitar("/resenas", {
    ...opciones,
    method: "POST",
    cuerpo: { productoId, calificacion, titulo, cuerpo },
  });
  return respuesta?.data ?? null;
}

export function eliminarResena({ id, ...opciones } = {}) {
  return solicitar(`/resenas/${encodeURIComponent(id)}`, { ...opciones, method: "DELETE" });
}
