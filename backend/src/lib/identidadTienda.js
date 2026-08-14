// Identidad de la tienda (nombre, contacto, dirección, horario, redes). Desde la
// sección "Identidad" del panel es editable por el dueño y vive en la base
// (IdentidadTienda, fila única). Estas constantes son el VALOR POR DEFECTO:
// alimentan el seed y sirven de respaldo si la base aún no tiene fila. Coinciden
// con lo que hoy muestra el footer del front. Redes en null = no se muestran.

// Etiquetas de los 7 días, índice 0 = lunes (así lo ordena el editor y la base).
export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Horario ESTRUCTURADO por defecto: Lun a Sáb 09:00–21:00, Dom 10:00–15:00. El
// editor lo selecciona; nunca se escribe a mano.
const HORARIO_POR_DEFECTO = [
  { abierto: true, apertura: '09:00', cierre: '21:00' }, // Lun
  { abierto: true, apertura: '09:00', cierre: '21:00' }, // Mar
  { abierto: true, apertura: '09:00', cierre: '21:00' }, // Mié
  { abierto: true, apertura: '09:00', cierre: '21:00' }, // Jue
  { abierto: true, apertura: '09:00', cierre: '21:00' }, // Vie
  { abierto: true, apertura: '09:00', cierre: '21:00' }, // Sáb
  { abierto: true, apertura: '10:00', cierre: '15:00' }, // Dom
]

export const IDENTIDAD_POR_DEFECTO = {
  nombre: 'SumarketExpress',
  email: 'hola@sumarketexpress.cl',
  telefono: '+56 9 1234 5678',
  whatsapp: null,
  direccion: 'Av. Matta 980, Santiago',
  horario: HORARIO_POR_DEFECTO,
  instagram: null,
  facebook: null,
  tiktok: null,
}

// Firma de un día para agrupar: los abiertos con el mismo tramo comparten clave;
// los cerrados comparten "cerrado".
function claveDia(dia) {
  return dia?.abierto ? `${dia.apertura}-${dia.cierre}` : 'cerrado'
}

/**
 * Deriva el texto de display del horario agrupando días consecutivos iguales.
 * Ej: [Lun..Sáb 09-21, Dom 10-15] → "Lun a Sáb 09:00–21:00 · Dom 10:00–15:00".
 * Un día suelto no se pluraliza ("Sáb 09:00–21:00"); los cerrados se muestran
 * como "cerrado". Es una función pura: se prueba sin base ni red.
 * @param {Array<{abierto:boolean,apertura:string,cierre:string}>} horario
 */
export function derivarHorarioTexto(horario) {
  if (!Array.isArray(horario) || horario.length === 0) return ''

  const grupos = []
  for (let i = 0; i < horario.length; i += 1) {
    const clave = claveDia(horario[i])
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.clave === clave) {
      ultimo.fin = i
    } else {
      grupos.push({ clave, inicio: i, fin: i, dia: horario[i] })
    }
  }

  return grupos
    .map((grupo) => {
      const etiqueta =
        grupo.inicio === grupo.fin
          ? DIAS_SEMANA[grupo.inicio]
          : `${DIAS_SEMANA[grupo.inicio]} a ${DIAS_SEMANA[grupo.fin]}`
      const valor = grupo.dia?.abierto
        ? `${grupo.dia.apertura}–${grupo.dia.cierre}`
        : 'cerrado'
      return `${etiqueta} ${valor}`
    })
    .join(' · ')
}
