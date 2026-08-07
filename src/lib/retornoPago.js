const RUTAS_RETORNO = {
  success: '/pago/exito',
  failure: '/pago/error',
  pending: '/pago/pendiente',
};

// Mercado Pago añade sus parámetros a la URL pública configurada en back_urls.
// El backend vuelve a la raíz con `?checkout_return=success|failure|pending` y
// este helper convierte ese retorno en una navegación interna de React sin
// perder payment_id, status ni external_reference.
export function obtenerRutaRetornoPago(urlActual) {
  const url = new URL(urlActual);
  const resultado = url.searchParams.get("checkout_return");
  const ruta = RUTAS_RETORNO[resultado];
  if (!ruta) return null;

  url.searchParams.delete("checkout_return");
  const base = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return `${base}${ruta.slice(1)}${url.search}${url.hash}`;
}

export function aplicarRetornoPago(windowActual = window) {
  const destino = obtenerRutaRetornoPago(windowActual.location.href);
  if (!destino) return false;

  windowActual.history.replaceState(null, "", destino);
  return true;
}
