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

  let respuesta;
  try {
    const esFormData = typeof FormData !== "undefined" && cuerpo instanceof FormData;
    respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}${ruta}`, {
      method,
      credentials: "include",
      ...(cuerpo
        ? {
            ...(esFormData ? {} : { headers: { "Content-Type": "application/json" } }),
            body: esFormData ? cuerpo : JSON.stringify(cuerpo),
          }
        : {}),
    });
  } catch {
    throw new ErrorAdminApi("No pudimos conectar con la API del panel. Revisa que el servidor esté disponible e inténtalo nuevamente.", {
      code: "NETWORK_ERROR",
    });
  }

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

export function cerrarSesionAdmin(opciones = {}) {
  return solicitarAdmin("/auth/logout", { ...opciones, method: "POST" });
}

export function cambiarContrasenaAdmin(contrasenaActual, contrasenaNueva, opciones = {}) {
  return solicitarAdmin("/auth/contrasena", {
    ...opciones,
    method: "PATCH",
    cuerpo: { contrasenaActual, contrasenaNueva },
  });
}

// Equipo (solo ADMIN). La lista llega como { data: [...] } → solicitarAdmin la
// desenvuelve al arreglo.
export function listarUsuariosAdmin(opciones = {}) {
  return solicitarAdmin("/admin/usuarios", opciones);
}

export function crearOperadorAdmin(datos, opciones = {}) {
  return solicitarAdmin("/admin/usuarios", { ...opciones, method: "POST", cuerpo: datos });
}

export function activarUsuarioAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/usuarios/${encodeURIComponent(id)}/activar`, {
    ...opciones,
    method: "PATCH",
  });
}

export function desactivarUsuarioAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/usuarios/${encodeURIComponent(id)}/desactivar`, {
    ...opciones,
    method: "PATCH",
  });
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

export function subirImagenProductoAdmin(archivo, opciones = {}) {
  const datos = new FormData();
  datos.append("imagen", archivo);
  return solicitarAdmin("/admin/imagenes", {
    ...opciones,
    method: "POST",
    cuerpo: datos,
  });
}

export function reemplazarImagenesProductoAdmin(id, imagenes, opciones = {}) {
  return solicitarAdmin(`/admin/productos/${encodeURIComponent(id)}/imagenes`, {
    ...opciones,
    method: "PUT",
    cuerpo: { imagenes },
  });
}

export function obtenerOpcionesProductoAdmin(opciones = {}) {
  return solicitarAdmin("/admin/referencias/producto", {
    ...opciones,
    incluirMeta: false,
  });
}

export function listarPedidosAdmin({ page = 1, limit = 20, estado, q, ...opciones } = {}) {
  const parametros = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (estado) parametros.set("estado", estado);
  if (q) parametros.set("q", q);
  return solicitarAdmin(`/admin/pedidos?${parametros}`, { ...opciones, incluirMeta: true });
}

export function obtenerPedidoAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/pedidos/${encodeURIComponent(id)}`, opciones);
}

export function cambiarEstadoPedidoAdmin(id, estado, nota, opciones = {}) {
  return solicitarAdmin(`/admin/pedidos/${encodeURIComponent(id)}/estado`, {
    ...opciones,
    method: "PATCH",
    cuerpo: nota ? { estado, nota } : { estado },
  });
}

export function obtenerResumenAdmin({ periodo, ...opciones } = {}) {
  const parametros = new URLSearchParams();
  if (periodo) parametros.set("periodo", periodo);
  const consulta = parametros.toString();
  return solicitarAdmin(`/admin/resumen${consulta ? `?${consulta}` : ""}`, opciones);
}

export function obtenerVentasDiariasAdmin({ dias, ...opciones } = {}) {
  const parametros = new URLSearchParams();
  if (dias) parametros.set("dias", String(dias));
  const consulta = parametros.toString();
  return solicitarAdmin(
    `/admin/resumen/ventas-diarias${consulta ? `?${consulta}` : ""}`,
    opciones,
  );
}

export function obtenerMasVendidosAdmin({ periodo, ...opciones } = {}) {
  const parametros = new URLSearchParams();
  if (periodo) parametros.set("periodo", periodo);
  const consulta = parametros.toString();
  return solicitarAdmin(
    `/admin/resumen/mas-vendidos${consulta ? `?${consulta}` : ""}`,
    opciones,
  );
}
