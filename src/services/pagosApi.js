const apiUrlPorDefecto = () => import.meta.env.VITE_API_URL;

// El frontend nunca calcula ni confirma un pago. Solo pide al backend una URL
// de pasarela para un pedido existente; el webhook será quien cambie su estado.
export async function iniciarPago({
  pedidoId,
  fetchImpl = fetch,
  apiUrl = apiUrlPorDefecto(),
} = {}) {
  if (!apiUrl) throw new Error("El pago requiere la API propia.");

  const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/pagos`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId }),
  });
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.error?.message ?? "No pudimos iniciar el pago.");
    error.code = datos?.error?.code;
    error.status = respuesta.status;
    throw error;
  }

  return datos?.data;
}

export async function obtenerEstadoPago({
  pagoId,
  fetchImpl = fetch,
  apiUrl = apiUrlPorDefecto(),
} = {}) {
  if (!apiUrl) throw new Error("El estado del pago requiere la API propia.");

  const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/pagos/${pagoId}`, {
    credentials: "include",
  });
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.error?.message ?? "No pudimos consultar el pago.");
    error.code = datos?.error?.code;
    error.status = respuesta.status;
    throw error;
  }

  return datos?.data;
}

// Reconciliación activa: al volver del checkout, le pide al servidor que consulte
// el estado real del pago a Mercado Pago y lo confirme, sin esperar al webhook.
// Devuelve el mismo snapshot que obtenerEstadoPago (ya actualizado).
export async function reconciliarPago({
  pagoId,
  fetchImpl = fetch,
  apiUrl = apiUrlPorDefecto(),
} = {}) {
  if (!apiUrl) throw new Error("La reconciliación del pago requiere la API propia.");

  const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/pagos/${pagoId}/reconciliar`, {
    method: "POST",
    credentials: "include",
  });
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.error?.message ?? "No pudimos reconciliar el pago.");
    error.code = datos?.error?.code;
    error.status = respuesta.status;
    throw error;
  }

  return datos?.data;
}