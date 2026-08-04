// Cliente del panel del personal. Todas las peticiones requieren la API propia
// y comparten la cookie httpOnly de la sesión administrativa.
const apiUrlPorDefecto = () => import.meta.env.VITE_API_URL;

export class ErrorAdminApi extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function solicitarAdmin(
  ruta,
  {
    method = "GET",
    cuerpo,
    fetchImpl = fetch,
    apiUrl = apiUrlPorDefecto(),
    incluirMeta = false,
  } = {},
) {
  if (!apiUrl) {
    throw new ErrorAdminApi("El panel requiere la API propia.", {
      code: "API_UNAVAILABLE",
    });
  }

  const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}${ruta}`, {
    method,
    credentials: "include",
    ...(cuerpo
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        }
      : {}),
  });

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorAdminApi(
      datos?.error?.message ?? "No pudimos procesar la solicitud del panel.",
      { code: datos?.error?.code, status: respuesta.status },
    );
  }

  return incluirMeta ? datos ?? { data: [], meta: null } : datos?.data ?? null;
}

export async function obtenerSesionAdmin(opciones = {}) {
  try {
    const datos = await solicitarAdmin("/auth/me", opciones);
    return datos?.usuario ?? null;
  } catch (error) {
    if (error instanceof ErrorAdminApi && error.status === 401) return null;
    throw error;
  }
}

export async function iniciarSesionAdmin(credenciales, opciones = {}) {
  const datos = await solicitarAdmin("/auth/login", {
    ...opciones,
    method: "POST",
    cuerpo: credenciales,
  });
  return datos?.usuario ?? null;
}

export function listarProductosAdmin(
  { page = 1, limit = 20, busqueda = "", estado, ...opciones } = {},
) {
  const parametros = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const termino = busqueda.trim();

  if (termino) parametros.set("q", termino);
  if (estado) parametros.set("estado", estado);

  return solicitarAdmin(`/admin/productos?${parametros}`, {
    ...opciones,
    incluirMeta: true,
  });
}

export function obtenerProductoAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/productos/${encodeURIComponent(id)}`, opciones);
}

export function crearProductoAdmin(producto, opciones = {}) {
  return solicitarAdmin("/admin/productos", {
    ...opciones,
    method: "POST",
    cuerpo: producto,
  });
}

export function actualizarProductoAdmin(id, cambios, opciones = {}) {
  return solicitarAdmin(`/admin/productos/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "PATCH",
    cuerpo: cambios,
  });
}

export function archivarProductoAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/productos/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "DELETE",
  });
}
