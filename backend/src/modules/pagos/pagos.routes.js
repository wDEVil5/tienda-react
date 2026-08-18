import { Router } from 'express'
import {
  iniciarPago,
  obtenerEstadoParaCheckout,
  procesarNotificacion,
  ErrorPago,
} from './pagos.service.js'
import { validarIniciarPago, validarPagoId } from './pagos.validacion.js'
import { verificarFirmaMercadoPago } from './pagos.firma.mercadopago.js'

// A qué código HTTP corresponde cada error de negocio del pago.
const ESTADO_POR_CODIGO = {
  ORDER_NOT_FOUND: 404,
  ORDER_NOT_PAYABLE: 409,
  ORDER_ALREADY_PAID: 409,
}

// Verificador por defecto: extrae la firma y el id del aviso de la request y los
// compara con la clave secreta del entorno. Sin clave configurada no bloquea (dev).
function verificarFirmaPorDefecto(request) {
  return verificarFirmaMercadoPago({
    xSignature: request.get('x-signature'),
    xRequestId: request.get('x-request-id'),
    // MP manda `data.id` en la query del webhook; el body queda como respaldo.
    dataId: request.query['data.id'] ?? request.body?.data?.id,
    secret: process.env.MP_WEBHOOK_SECRET,
  })
}

// Inicia el pago de un pedido y devuelve la URL a la que redirigir al cliente.
// El id del pedido (uuid) actúa como capacidad, igual que el checkout de
// invitado; no exige sesión.
export function crearRouterPagos(
  servicio = { iniciarPago, obtenerEstadoParaCheckout, procesarNotificacion },
  verificarFirma = verificarFirmaPorDefecto,
) {
  const router = Router()

  // El retorno del navegador no acredita nada: consulta este snapshot y espera
  // a que el webhook haya confirmado el estado real en la base de datos.
  router.get('/:pagoId', async (request, response, next) => {
    const validacion = validarPagoId(request.params.pagoId)
    if (!validacion.success) {
      return response.status(404).json({
        error: { code: 'PAYMENT_NOT_FOUND', message: 'No encontramos el pago.' },
      })
    }

    try {
      const pago = await servicio.obtenerEstadoParaCheckout(validacion.data)
      if (!pago) {
        return response.status(404).json({
          error: { code: 'PAYMENT_NOT_FOUND', message: 'No encontramos el pago.' },
        })
      }
      return response.json({ data: pago })
    } catch (error) {
      return next(error)
    }
  })

  // Webhook del proveedor (servidor a servidor). Verifica primero la firma; si es
  // válida, procesa y responde 200 para acusar recibo (el proveedor no reintenta).
  // Un error inesperado (500) provoca reintento; una firma inválida es 401 (no se
  // procesa y no tiene sentido reintentarla).
  router.post('/webhook', async (request, response, next) => {
    const firma = verificarFirma(request)
    if (!firma.ok) {
      return response.status(401).json({
        error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Firma de webhook inválida.' },
      })
    }

    try {
      // MP manda la novedad en el body (webhook nuevo) o en la query (IPN viejo);
      // se combinan para que la pasarela lea cualquiera de los dos formatos.
      const resultado = await servicio.procesarNotificacion({ ...request.query, ...request.body })
      return response.status(200).json({ ok: true, ...resultado })
    } catch (error) {
      return next(error)
    }
  })

  router.post('/', async (request, response, next) => {
    const validacion = validarIniciarPago(request.body)
    if (!validacion.success) {
      return response.status(422).json({
        error: { code: 'INVALID_PAYMENT_DATA', message: 'Revisa los datos del pago.' },
      })
    }

    try {
      const resultado = await servicio.iniciarPago(validacion.data.pedidoId)
      return response.status(201).json({ data: resultado })
    } catch (error) {
      if (error instanceof ErrorPago) {
        const status = ESTADO_POR_CODIGO[error.code] ?? 400
        return response.status(status).json({
          error: { code: error.code, message: error.message },
        })
      }
      return next(error)
    }
  })

  return router
}

export default crearRouterPagos()
