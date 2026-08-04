// Cliente de la cuenta del comprador. A diferencia del catálogo, estas llamadas
// siempre requieren la API propia y envían la cookie httpOnly cross-site.
const apiUrlPorDefecto = () => import.meta.env.VITE_API_URL;

export class ErrorCuentaApi extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function solicitarCuenta(
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
    throw new ErrorCuentaApi("La cuenta requiere la API propia.", {
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
    throw new ErrorCuentaApi(
      datos?.error?.message ?? "No pudimos procesar tu cuenta.",
      { code: datos?.error?.code, status: respuesta.status },
    );
  }

  return incluirMeta ? datos ?? { data: null, meta: null } : datos?.data ?? null;
}

// GET /cuenta devuelve null solo para el estado normal de visitante; otros
// errores se propagan para que la interfaz pueda informar una caída real.
export async function obtenerCuenta(opciones = {}) {
  try {
    const datos = await solicitarCuenta("/cuenta", opciones);
    return datos?.cliente ?? null;
  } catch (error) {
    if (error instanceof ErrorCuentaApi && error.status === 401) return null;
    throw error;
  }
}

export function registrarCuenta(datos, opciones = {}) {
  return solicitarCuenta("/cuenta/registro", {
    ...opciones,
    method: "POST",
    cuerpo: datos,
  });
}

export function iniciarSesionCuenta(datos, opciones = {}) {
  return solicitarCuenta("/cuenta/login", {
    ...opciones,
    method: "POST",
    cuerpo: datos,
  });
}

export function cerrarSesionCuenta(opciones = {}) {
  return solicitarCuenta("/cuenta/logout", { ...opciones, method: "POST" });
}

// Estas colecciones pertenecen a la sesión actual: el cliente nunca envía su
// id. La API lo obtiene desde la cookie httpOnly antes de consultar la base.
export function listarDireccionesCuenta(opciones = {}) {
  return solicitarCuenta("/cuenta/direcciones", opciones);
}

export function crearDireccionCuenta(datos, opciones = {}) {
  return solicitarCuenta("/cuenta/direcciones", {
    ...opciones,
    method: "POST",
    cuerpo: datos,
  });
}

export function actualizarDireccionCuenta(id, datos, opciones = {}) {
  return solicitarCuenta(`/cuenta/direcciones/${id}`, {
    ...opciones,
    method: "PATCH",
    cuerpo: datos,
  });
}

export function eliminarDireccionCuenta(id, opciones = {}) {
  return solicitarCuenta(`/cuenta/direcciones/${id}`, {
    ...opciones,
    method: "DELETE",
  });
}

export function listarPedidosCuenta(
  { page = 1, limit = 50, estado, ...opciones } = {},
) {
  const parametros = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (estado) parametros.set("estado", estado);

  return solicitarCuenta(`/cuenta/pedidos?${parametros}`, {
    ...opciones,
    incluirMeta: true,
  });
}

export function obtenerPedidoCuenta(id, opciones = {}) {
  return solicitarCuenta(`/cuenta/pedidos/${id}`, opciones);
}
