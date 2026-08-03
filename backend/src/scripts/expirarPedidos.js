import { prisma } from '../lib/prisma.js'
import { expirarPedidosPendientes } from '../modules/pedidos/pedidos.service.js'

// Barrido de expiración de pedidos pendientes: cancela los PENDIENTE que
// superaron la ventana (MINUTOS_EXPIRACION_PENDIENTE) y libera su reserva de
// stock. Pensado para correrse de forma programada (cron) o a mano.
async function expirar() {
  const resultado = await expirarPedidosPendientes()
  console.log(`Pedidos revisados: ${resultado.revisados} · expirados: ${resultado.expirados}`)
}

expirar()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
