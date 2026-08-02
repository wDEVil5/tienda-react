// Error de dominio de pedidos. Vive en su propio módulo para que el servicio y
// el repositorio lo compartan sin importarse entre sí (evita dependencia
// circular). La ruta HTTP mapea `code` al estado de respuesta.
export class ErrorPedido extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}
