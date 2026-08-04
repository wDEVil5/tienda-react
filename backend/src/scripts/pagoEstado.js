import { prisma } from '../lib/prisma.js'

// Muestra el estado de un pedido y sus pagos, para verificar que el webhook lo
// avanzó. Uso: npm run pago:estado -- <pedidoId>
async function pagoEstado() {
  const pedidoId = process.argv[2]
  if (!pedidoId) {
    throw new Error('Falta el id del pedido. Uso: npm run pago:estado -- <pedidoId>')
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: {
      numero: true,
      estado: true,
      total: true,
      pagos: {
        orderBy: { createdAt: 'asc' },
        select: { estado: true, proveedor: true, monto: true, referenciaExterna: true },
      },
    },
  })
  if (!pedido) {
    throw new Error(`No existe el pedido ${pedidoId}.`)
  }

  console.log(`#SE-${pedido.numero} · pedido ${pedido.estado} · total ${pedido.total}`)
  if (pedido.pagos.length === 0) {
    console.log('  (sin pagos)')
  }
  for (const pago of pedido.pagos) {
    console.log(`  pago ${pago.estado} · ${pago.proveedor} · monto ${pago.monto} · ref ${pago.referenciaExterna ?? '-'}`)
  }
}

pagoEstado()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
