// Acceso a la API de pedidos. A diferencia del catálogo, cotizar y crear SIEMPRE
// requieren el backend propio: no hay respaldo Fake Store (no crea pedidos). Sin
// VITE_API_URL (p. ej. en la demo de GitHub Pages) fallan con un mensaje claro.

const apiUrlPorDefecto = () =>
  import.meta.env.DEV ? import.meta.env.VITE_API_URL : undefined;

export function hayApiPedidos(apiUrl = apiUrlPorDefecto()) {
  return Boolean(apiUrl);
}

async function postJson(url, cuerpo, fetchImpl) {
  const respuesta = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // Propaga code/status para que el checkout distinga "sin stock" (409) de un
    // error de validación (422) y muestre el mensaje adecuado.
    const error = new Error(datos?.error?.message ?? "No se pudo procesar el pedido.");
    error.code = datos?.error?.code;
    error.status = respuesta.status;
    throw error;
  }

  return datos?.data;
}

export async function cotizarPedido({
  modalidad,
  comuna,
  items,
  fetchImpl = fetch,
  apiUrl = apiUrlPorDefecto(),
} = {}) {
  if (!apiUrl) {
    throw new Error("El checkout requiere la API propia (no disponible en la demo).");
  }

  return postJson(
    `${apiUrl.replace(/\/$/, "")}/pedidos/cotizar`,
    { modalidad, ...(comuna ? { comuna } : {}), items },
    fetchImpl,
  );
}

export async function crearPedido({
  contacto,
  modalidad,
  direccion,
  items,
  fetchImpl = fetch,
  apiUrl = apiUrlPorDefecto(),
} = {}) {
  if (!apiUrl) {
    throw new Error("El checkout requiere la API propia (no disponible en la demo).");
  }

  return postJson(
    `${apiUrl.replace(/\/$/, "")}/pedidos`,
    { contacto, modalidad, ...(direccion ? { direccion } : {}), items },
    fetchImpl,
  );
}
