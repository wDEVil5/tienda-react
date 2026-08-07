// Reglas comerciales para la UI (umbral de envío gratis, tarifas por comuna,
// corte de retiro). La fuente de verdad es el backend: GET /api/reglas, que a su
// vez lee lib/reglasTienda.js. Sin API propia (p. ej. si la API está dormida)
// caemos a estos valores por defecto, que deben reflejar los mismos números del
// backend para que la barra "faltan $X para envío gratis" no mienta.
export const REGLAS_POR_DEFECTO = {
  envioGratisDesde: 20000,
  tarifaBase: 2990,
  corteRetiroHoy: "19:00",
  preparacionHoras: 2,
  horarioEntrega: "Lun a Vie · 09:00 a 18:00",
  tarifasComuna: [],
};

export async function obtenerReglas({
  fetchImpl = fetch,
  apiUrl = import.meta.env.VITE_API_URL,
} = {}) {
  if (!apiUrl) return REGLAS_POR_DEFECTO;

  try {
    const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/reglas`);
    if (!respuesta.ok) return REGLAS_POR_DEFECTO;

    const datos = await respuesta.json();
    // Mezclamos sobre los defaults: si el backend agrega o quita un campo, la UI
    // no se rompe (los que falten quedan con su valor por defecto).
    return { ...REGLAS_POR_DEFECTO, ...(datos?.data ?? {}) };
  } catch {
    return REGLAS_POR_DEFECTO;
  }
}
