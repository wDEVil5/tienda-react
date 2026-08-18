// Pasarelas de pago intercambiables. El servicio de pagos no sabe con qué
// proveedor se cobra: recibe una pasarela que implemente esta interfaz. Igual
// que el transporte de correo, así el proveedor real (Mercado Pago) se enchufa
// después sin tocar la lógica.
//
// Interfaz de una pasarela:
//   proveedor: string  — nombre corto ('fake', 'mercadopago')
//   crearPreferencia({ pagoId, pedidoNumero, monto }) ->
//     { referenciaExterna, urlPago }
//   interpretarNotificacion(payload) -> { referenciaExterna, estado } | null
//     (lo usa el webhook en CP3; `estado` es un EstadoPago)

// Pasarela falsa para desarrollo y pruebas: no cobra nada. Deriva una referencia
// del pago y una URL de pago simulada. `referenciaExterna` es distinta del id del
// pago a propósito: así se prueba que el emparejamiento del webhook va por la
// referencia del proveedor, no por nuestra llave.
export function crearPasarelaFalsa({ prefijo = 'fake' } = {}) {
  return {
    proveedor: 'fake',

    async crearPreferencia({ pagoId }) {
      const referenciaExterna = `${prefijo}-${pagoId}`
      return {
        referenciaExterna,
        urlPago: `https://pago.local/checkout/${referenciaExterna}`,
      }
    },

    // El webhook (CP3) traduce la carga del proveedor a nuestra forma. La falsa
    // espera un payload simple { referenciaExterna, estado }.
    interpretarNotificacion(payload) {
      if (!payload?.referenciaExterna || !payload?.estado) {
        return null
      }
      return { referenciaExterna: payload.referenciaExterna, estado: payload.estado }
    },

    // La pasarela falsa no tiene un pago externo que consultar: la reconciliación
    // no aplica (en dev el estado se confirma con el webhook simulado).
    async consultarPorReferencia() {
      return null
    },
  }
}
