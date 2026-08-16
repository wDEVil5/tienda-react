import { expirarPedidosPendientes } from './pedidos.service.js'

// Barrido de expiración corriendo DENTRO del proceso del server. Es la
// alternativa al cron externo: para una tienda única en free tier alcanza con
// que el propio backend limpie sus pendientes mientras está vivo. No se
// auto-invoca al importar (los tests no deben lanzar timers); server.js lo
// arranca explícitamente, y app.js —que importan los tests— no.
export function iniciarBarridoExpiracion({
  cadaMinutos = Number(process.env.MINUTOS_BARRIDO_EXPIRACION) || 30,
  ejecutar = expirarPedidosPendientes,
  logger = console,
} = {}) {
  // Evita solapar dos barridos si uno se demora más que el intervalo.
  let corriendo = false

  const tick = async () => {
    if (corriendo) return
    corriendo = true
    try {
      const { revisados, expirados } = await ejecutar()
      if (expirados > 0) {
        logger.log(`[barrido] pedidos revisados: ${revisados} · expirados: ${expirados}`)
      }
    } catch (error) {
      // Un fallo del barrido nunca debe voltear el server: se registra y sigue.
      logger.error(`[barrido] no se pudo expirar pedidos: ${error.message}`)
    } finally {
      corriendo = false
    }
  }

  const intervalo = setInterval(tick, cadaMinutos * 60_000)
  // El barrido por sí solo no debe impedir que el proceso termine.
  intervalo.unref?.()
  // Un primer barrido al arrancar, para no esperar el intervalo completo tras un
  // reinicio (los pedidos acumulados se limpian de inmediato).
  tick()

  return {
    detener() {
      clearInterval(intervalo)
    },
  }
}
