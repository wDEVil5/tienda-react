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

// Cierra la sesión en todos los dispositivos (revoca todas las sesiones activas,
// incluida la actual). Tras esto la cookie ya no sirve → volver al login.
export function cerrarTodasLasSesionesAdmin(opciones = {}) {
  return solicitarAdmin("/auth/logout-todos", { ...opciones, method: "POST" });
}

export function cambiarContrasenaAdmin(contrasenaActual, contrasenaNueva, opciones = {}) {
  return solicitarAdmin("/auth/contrasena", {
    ...opciones,
    method: "PATCH",
    cuerpo: { contrasenaActual, contrasenaNueva },
  });
}

// Edita el propio nombre. Devuelve el usuario actualizado ({ id, nombre, email,
// rol }) para refrescar el estado del panel sin volver a pedir la sesión.
export async function actualizarPerfilAdmin(nombre, opciones = {}) {
  const datos = await solicitarAdmin("/auth/perfil", {
    ...opciones,
    method: "PATCH",
    cuerpo: { nombre },
  });
  return datos?.usuario ?? null;
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

export function restablecerContrasenaUsuarioAdmin(id, contrasena, opciones = {}) {
  return solicitarAdmin(`/admin/usuarios/${encodeURIComponent(id)}/contrasena`, {
    ...opciones,
    method: "PATCH",
    cuerpo: { contrasena },
  });
}

export function eliminarUsuarioAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/usuarios/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "DELETE",
  });
}

// Recuperación de contraseña del propio staff (olvidé mi clave, sin sesión). No
// confundir con restablecerContrasenaUsuarioAdmin (un ADMIN resetea a un operador).
// La API responde SIEMPRE igual, exista o no el correo.
export function solicitarRecuperacionAdmin(email, opciones = {}) {
  return solicitarAdmin("/auth/contrasena/recuperacion", {
    ...opciones,
    method: "POST",
    cuerpo: { email },
  });
}

// Restablece con el token del enlace del correo (204 sin cuerpo).
export function restablecerContrasenaConTokenAdmin(token, contrasenaNueva, opciones = {}) {
  return solicitarAdmin("/auth/contrasena/restablecer", {
    ...opciones,
    method: "POST",
    cuerpo: { token, contrasenaNueva },
  });
}

// Marcas: el dominio es el identificador de Brandfetch. El logo se resuelve
// directo desde su CDN en la tienda, por eso no enviamos ninguna API key.
export function listarMarcasAdmin(opciones = {}) {
  return solicitarAdmin("/admin/marcas", opciones);
}

export function crearMarcaAdmin(datos, opciones = {}) {
  return solicitarAdmin("/admin/marcas", { ...opciones, method: "POST", cuerpo: datos });
}

export function actualizarDominioBrandfetchAdmin(id, brandfetchDomain, opciones = {}) {
  return solicitarAdmin(`/admin/marcas/${encodeURIComponent(id)}/brandfetch`, {
    ...opciones,
    method: "PATCH",
    cuerpo: { brandfetchDomain: brandfetchDomain || null },
  });
}

// Categorías (ADMIN + OPERADOR para leer/crear/activar). La lista llega como
// { data } → solicitarAdmin la desenvuelve al arreglo.
export function listarCategoriasAdmin(opciones = {}) {
  return solicitarAdmin("/admin/categorias", opciones);
}

export function crearCategoriaAdmin(datos, opciones = {}) {
  return solicitarAdmin("/admin/categorias", { ...opciones, method: "POST", cuerpo: datos });
}

export function activarCategoriaAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/categorias/${encodeURIComponent(id)}/activar`, {
    ...opciones,
    method: "PATCH",
  });
}

export function desactivarCategoriaAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/categorias/${encodeURIComponent(id)}/desactivar`, {
    ...opciones,
    method: "PATCH",
  });
}

// Subcategorías (solo ADMIN). Anidadas bajo su categoría para leer/crear.
export function listarSubcategoriasAdmin(categoriaId, opciones = {}) {
  return solicitarAdmin(`/admin/categorias/${encodeURIComponent(categoriaId)}/subcategorias`, opciones);
}

export function crearSubcategoriaAdmin(categoriaId, datos, opciones = {}) {
  return solicitarAdmin(`/admin/categorias/${encodeURIComponent(categoriaId)}/subcategorias`, {
    ...opciones,
    method: "POST",
    cuerpo: datos,
  });
}

export function actualizarSubcategoriaAdmin(id, cambios, opciones = {}) {
  return solicitarAdmin(`/admin/subcategorias/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "PATCH",
    cuerpo: cambios,
  });
}

export function eliminarSubcategoriaAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/subcategorias/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "DELETE",
  });
}

// Tercer nivel de la taxonomía. Se administra bajo una subcategoría concreta;
// el listado llega incluido en listarSubcategoriasAdmin para evitar otra carga.
export function crearSubcategoriaHijaAdmin(subcategoriaId, datos, opciones = {}) {
  return solicitarAdmin(`/admin/subcategorias/${encodeURIComponent(subcategoriaId)}/hijas`, {
    ...opciones,
    method: "POST",
    cuerpo: datos,
  });
}

export function actualizarSubcategoriaHijaAdmin(id, cambios, opciones = {}) {
  return solicitarAdmin(`/admin/subcategorias-hijas/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "PATCH",
    cuerpo: cambios,
  });
}

export function eliminarSubcategoriaHijaAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/subcategorias-hijas/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "DELETE",
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

// Reactiva un producto archivado (vuelve a BORRADOR).
export function restaurarProductoAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/productos/${encodeURIComponent(id)}/restaurar`, {
    ...opciones,
    method: "PATCH",
  });
}

// Borrado definitivo (solo productos sin ventas; el server responde 409 si tiene).
export function eliminarProductoAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/productos/${encodeURIComponent(id)}/definitivo`, {
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

// Reglas de la tienda / Envíos (solo ADMIN). GET trae el formulario completo;
// las tarifas vienen con `comuna` (clave normalizada) que el PUT NO acepta (su
// contrato es estricto y deriva la clave del nombre). Por eso al guardar se
// envían solo { nombre, tarifa, plazoHoras }.
export function obtenerReglasAdmin(opciones = {}) {
  return solicitarAdmin("/admin/reglas", opciones);
}

export function guardarReglasAdmin(reglas, opciones = {}) {
  const cuerpo = {
    envioGratisDesde: reglas.envioGratisDesde,
    tarifaBase: reglas.tarifaBase,
    corteRetiroHoy: reglas.corteRetiroHoy,
    preparacionHoras: reglas.preparacionHoras,
    horarioEntrega: reglas.horarioEntrega,
    tarifasComuna: (reglas.tarifasComuna ?? []).map(({ nombre, tarifa, plazoHoras }) => ({
      nombre,
      tarifa,
      plazoHoras: plazoHoras ?? null,
    })),
  };
  return solicitarAdmin("/admin/reglas", { ...opciones, method: "PUT", cuerpo });
}

// Identidad de la tienda (solo ADMIN). GET trae la forma completa; PUT la guarda
// entera. Los campos opcionales vacíos ("") el backend los normaliza a null.
export function obtenerIdentidadAdmin(opciones = {}) {
  return solicitarAdmin("/admin/identidad", opciones);
}

export function guardarIdentidadAdmin(identidad, opciones = {}) {
  const cuerpo = {
    nombre: identidad.nombre,
    email: identidad.email,
    telefono: identidad.telefono,
    direccion: identidad.direccion,
    horario: identidad.horario,
    whatsapp: identidad.whatsapp ?? "",
    instagram: identidad.instagram ?? "",
    facebook: identidad.facebook ?? "",
    tiktok: identidad.tiktok ?? "",
  };
  return solicitarAdmin("/admin/identidad", { ...opciones, method: "PUT", cuerpo });
}

// Páginas de contenido (solo ADMIN). La lista y la página llegan como { data }.
export function listarPaginasAdmin(opciones = {}) {
  return solicitarAdmin("/admin/paginas", opciones);
}

export function obtenerPaginaAdmin(slug, opciones = {}) {
  return solicitarAdmin(`/admin/paginas/${encodeURIComponent(slug)}`, opciones);
}

export function guardarPaginaAdmin(slug, { titulo, cuerpo, publicada }, opciones = {}) {
  return solicitarAdmin(`/admin/paginas/${encodeURIComponent(slug)}`, {
    ...opciones,
    method: "PUT",
    cuerpo: { titulo, cuerpo, publicada },
  });
}

// Banners del carrusel del home (solo ADMIN). La imagen se sube aparte (como en
// productos) y luego se crea/edita el banner con { imagenUrl, storageKey }.
export function listarBannersAdmin(opciones = {}) {
  return solicitarAdmin("/admin/banners", opciones);
}

export function obtenerBannerAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/banners/${encodeURIComponent(id)}`, opciones);
}

export function crearBannerAdmin(datos, opciones = {}) {
  return solicitarAdmin("/admin/banners", { ...opciones, method: "POST", cuerpo: datos });
}

export function actualizarBannerAdmin(id, cambios, opciones = {}) {
  return solicitarAdmin(`/admin/banners/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "PATCH",
    cuerpo: cambios,
  });
}

export function eliminarBannerAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/banners/${encodeURIComponent(id)}`, {
    ...opciones,
    method: "DELETE",
  });
}

export function subirImagenBannerAdmin(archivo, opciones = {}) {
  const datos = new FormData();
  datos.append("imagen", archivo);
  return solicitarAdmin("/admin/banners/imagen", {
    ...opciones,
    method: "POST",
    cuerpo: datos,
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

// Clientes (ADMIN + OPERADOR). La lista llega paginada como { data, meta }; el
// detalle como { data } → solicitarAdmin lo desenvuelve al objeto.
export function listarClientesAdmin({ page = 1, limit = 20, q, ...opciones } = {}) {
  const parametros = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) parametros.set("q", q);
  return solicitarAdmin(`/admin/clientes?${parametros}`, { ...opciones, incluirMeta: true });
}

export function obtenerClienteAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/clientes/${encodeURIComponent(id)}`, opciones);
}

// Inventario (ADMIN + OPERADOR). Devuelve { data, meta, resumen } → se pide con
// incluirMeta para conservar meta y resumen (solicitarAdmin no recorta extras).
export function listarInventarioAdmin({ page = 1, limit = 20, q, bajoStock, ...opciones } = {}) {
  const parametros = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) parametros.set("q", q);
  if (bajoStock) parametros.set("bajoStock", "1");
  return solicitarAdmin(`/admin/inventario?${parametros}`, { ...opciones, incluirMeta: true });
}

export function listarMovimientosStockAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/inventario/${encodeURIComponent(id)}/movimientos`, opciones);
}

// Ajuste de stock: crea un movimiento. Devuelve { fila, movimiento } (el usuario
// que lo hizo lo pone el backend desde la sesión, nunca se manda desde aquí).
export function ajustarStockAdmin(id, { delta, motivo, nota }, opciones = {}) {
  return solicitarAdmin(`/admin/inventario/${encodeURIComponent(id)}/movimientos`, {
    ...opciones,
    method: "POST",
    cuerpo: nota ? { delta, motivo, nota } : { delta, motivo },
  });
}

export function activarClienteAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/clientes/${encodeURIComponent(id)}/activar`, {
    ...opciones,
    method: "PATCH",
  });
}

export function desactivarClienteAdmin(id, opciones = {}) {
  return solicitarAdmin(`/admin/clientes/${encodeURIComponent(id)}/desactivar`, {
    ...opciones,
    method: "PATCH",
  });
}
