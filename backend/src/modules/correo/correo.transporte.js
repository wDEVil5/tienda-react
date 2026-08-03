// Transportes de correo intercambiables. El servicio de correo no sabe *cómo*
// se envía un mensaje: recibe un transporte que implemente enviar(mensaje). Así
// desarrollo y pruebas no dependen de un proveedor real, y conectar SMTP el día
// de mañana es agregar un transporte nuevo, no reescribir la lógica.

// Transporte de desarrollo en memoria: guarda los correos para inspeccionarlos
// en pruebas. No envía nada fuera.
export function crearTransporteMemoria() {
  const enviados = []
  return {
    async enviar(mensaje) {
      enviados.push(mensaje)
      return { id: `mem-${enviados.length}` }
    },
    enviados,
  }
}

// Transporte de consola: registra el correo en el log del servidor. Es el que
// usa el servidor mientras no haya un proveedor real conectado.
export function crearTransporteConsola() {
  return {
    async enviar(mensaje) {
      console.log(`[correo] para=${mensaje.para} asunto="${mensaje.asunto}"`)
      return { id: `log-${Date.now()}` }
    },
  }
}
