// Identidad de la tienda (nombre, contacto, dirección, horario, redes). Desde la
// sección "Identidad" del panel es editable por el dueño y vive en la base
// (IdentidadTienda, fila única). Estas constantes son el VALOR POR DEFECTO:
// alimentan el seed y sirven de respaldo si la base aún no tiene fila. Coinciden
// con lo que hoy muestra el footer del front, para que "borrar los hardcodes" no
// cambie lo visible. Redes en null = no se muestran hasta que el dueño las cargue.

export const IDENTIDAD_POR_DEFECTO = {
  nombre: 'SumarketExpress',
  email: 'hola@sumarketexpress.cl',
  telefono: '+56 9 1234 5678',
  whatsapp: null,
  direccion: 'Av. Matta 980, Santiago',
  horarioAtencion: 'Lun a sáb 09-21h · Dom 10-15h',
  instagram: null,
  facebook: null,
  tiktok: null,
}
