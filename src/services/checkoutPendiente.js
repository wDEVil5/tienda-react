const CLAVE_CHECKOUT_PENDIENTE = "sumarket:checkout-pendiente";

// No creamos el pedido en el primer paso: la sesión solo conserva la
// cotización ya calculada por el servidor y la presentación necesaria para
// avanzar. El pedido definitivo se crea al confirmar el pago.
export function guardarCheckoutPendiente(checkout) {
  if (typeof window === "undefined" || !checkout?.cotizacion) return;

  window.sessionStorage.setItem(
    CLAVE_CHECKOUT_PENDIENTE,
    JSON.stringify(checkout),
  );
}

export function obtenerCheckoutPendiente() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.sessionStorage.getItem(CLAVE_CHECKOUT_PENDIENTE) ?? "null");
  } catch {
    // Un valor viejo o corrupto no debe bloquear el checkout: mostramos el
    // estado de recuperación y dejamos volver a crear un pedido válido.
    return null;
  }
}

export function actualizarCheckoutPendiente(cambios) {
  const actual = obtenerCheckoutPendiente();
  if (!actual) return null;

  const siguiente = { ...actual, ...cambios };
  guardarCheckoutPendiente(siguiente);
  return siguiente;
}
