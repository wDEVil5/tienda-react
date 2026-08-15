// Identidad de la tienda para la UI (nombre, contacto, dirección, horario, redes).
// La fuente de verdad es el backend: GET /api/identidad, que lee la base (o su
// default). Sin API propia (p. ej. si está dormida) caemos a estos valores por
// defecto, que reflejan los mismos del backend para que el footer no mienta.
// Horario estructurado por defecto (índice 0 = Lunes … 6 = Domingo), igual al
// del backend. Permite calcular "abierto/cerrado ahora" aunque la API esté dormida.
const HORARIO_POR_DEFECTO = [
  { abierto: true, apertura: "09:00", cierre: "21:00" }, // Lun
  { abierto: true, apertura: "09:00", cierre: "21:00" }, // Mar
  { abierto: true, apertura: "09:00", cierre: "21:00" }, // Mié
  { abierto: true, apertura: "09:00", cierre: "21:00" }, // Jue
  { abierto: true, apertura: "09:00", cierre: "21:00" }, // Vie
  { abierto: true, apertura: "09:00", cierre: "21:00" }, // Sáb
  { abierto: true, apertura: "10:00", cierre: "15:00" }, // Dom
];

export const IDENTIDAD_POR_DEFECTO = {
  nombre: "SumarketExpress",
  email: "hola@sumarketexpress.cl",
  telefono: "+56 9 1234 5678",
  whatsapp: null,
  direccion: "Av. Matta 980, Santiago",
  horario: HORARIO_POR_DEFECTO,
  horarioTexto: "Lun a Sáb 09:00–21:00 · Dom 10:00–15:00",
  instagram: null,
  facebook: null,
  tiktok: null,
};

// Convierte "HH:MM" a minutos desde medianoche.
function aMinutos(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

// ¿La tienda está abierta AHORA según el horario estructurado? Devuelve
// { abierta } o null si no hay horario válido (el footer entonces omite la línea).
// getDay(): 0=Dom…6=Sáb; el horario usa 0=Lun, de ahí el (getDay()+6)%7.
export function calcularEstadoApertura(horario, ahora = new Date()) {
  if (!Array.isArray(horario) || horario.length < 7) return null;
  const dia = horario[(ahora.getDay() + 6) % 7];
  if (!dia?.abierto) return { abierta: false };
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  return { abierta: ahoraMin >= aMinutos(dia.apertura) && ahoraMin < aMinutos(dia.cierre) };
}

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
