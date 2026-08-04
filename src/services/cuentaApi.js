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
  { method = "GET", cuerpo, fetchImpl = fetch, apiUrl = apiUrlPorDefecto() } = {},
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

  return datos?.data ?? null;
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
