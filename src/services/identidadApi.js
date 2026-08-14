// Identidad de la tienda para la UI (nombre, contacto, dirección, horario, redes).
// La fuente de verdad es el backend: GET /api/identidad, que lee la base (o su
// default). Sin API propia (p. ej. si está dormida) caemos a estos valores por
// defecto, que reflejan los mismos del backend para que el footer no mienta.
export const IDENTIDAD_POR_DEFECTO = {
  nombre: "SumarketExpress",
  email: "hola@sumarketexpress.cl",
  telefono: "+56 9 1234 5678",
  whatsapp: null,
  direccion: "Av. Matta 980, Santiago",
  horarioTexto: "Lun a Sáb 09:00–21:00 · Dom 10:00–15:00",
  instagram: null,
  facebook: null,
  tiktok: null,
};

export async function obtenerIdentidad({
  fetchImpl = fetch,
  apiUrl = import.meta.env.VITE_API_URL,
} = {}) {
  if (!apiUrl) return IDENTIDAD_POR_DEFECTO;

  try {
    const respuesta = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/identidad`);
    if (!respuesta.ok) return IDENTIDAD_POR_DEFECTO;

    const datos = await respuesta.json();
    // Mezclamos sobre los defaults: si el backend agrega o quita un campo, la UI
    // no se rompe (los que falten quedan con su valor por defecto).
    return { ...IDENTIDAD_POR_DEFECTO, ...(datos?.data ?? {}) };
  } catch {
    return IDENTIDAD_POR_DEFECTO;
  }
}
