import { prisma } from '../lib/prisma.js'
import { crearServicioPedidos } from '../modules/pedidos/pedidos.service.js'
import { crearServicioPagos } from '../modules/pagos/pagos.service.js'

// Crea un pedido de prueba e inicia su pago, imprimiendo el link de checkout.
// Sirve para cerrar el loop del webhook a mano (ver BACKEND.md → Pagos Fase 4).
// Con MP_ACCESS_TOKEN configurado, genera una preferencia real de Mercado Pago.
async function pagoDemo() {
  const producto = await prisma.producto.findFirst({
    where: { estado: 'PUBLICADO', stock: { gte: 1 } },
    select: { id: true, nombre: true },
  })
  if (!producto) {
    throw new Error('No hay productos publicados con stock para la demo.')
  }

  const pedido = await crearServicioPedidos().crearPedido({
    modalidad: 'RETIRO',
    contacto: { nombre: 'Prueba MP', email: 'prueba@correo.cl', telefono: '+56911111111' },
    items: [{ productoId: producto.id, cantidad: 1 }],
  })
  const pago = await crearServicioPagos().iniciarPago(pedido.id)

  console.log(`Pedido:    ${pedido.id}  (#SE-${pedido.numero}, total ${pedido.total})`)
  console.log(`Producto:  ${producto.nombre}`)
  console.log(`Paga aquí: ${pago.urlPago}`)
  console.log(`\nLuego revisa el estado con:  npm run pago:estado -- ${pedido.id}`)
}

pagoDemo()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
