import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPedidos, ErrorPedido } from '../src/modules/pedidos/pedidos.service.js'

const contacto = {
  nombre: 'Camila R.',
  email: 'camila@correo.cl',
  telefono: '+56 9 8765 4321',
}

// Repo falso: devuelve los productos declarados y captura lo que recibe la
// transacción, para poder afirmar sobre los montos y snapshots calculados.
function crearRepoFalso(productos) {
  const captura = { transaccion: null, llamadas: 0 }
  const repositorio = {
    async obtenerParaPedido(ids) {
      return productos.filter((producto) => ids.includes(producto.id))
    },
    async crearPedidoTransaccional(datos) {
      captura.transaccion = datos
      captura.llamadas += 1
      return { numero: 1, ...datos.pedido, items: datos.items }
    },
  }
  return { repositorio, captura }
}

const ACEITE = {
  id: 'p1', sku: 'ACE', nombre: 'Aceite', precio: 7990, precioAnterior: 10653,
  stock: 12, stockReservado: 0, tieneOfertaVigente: true,
}
const CAFE = {
  id: 'p2', sku: 'CAFE', nombre: 'Café', precio: 5490, precioAnterior: null,
  stock: 25, stockReservado: 0, tieneOfertaVigente: false,
}

test('recalcula precios y totales en el servidor (retiro)', async () => {
  const { repositorio, captura } = crearRepoFalso([ACEITE, CAFE])
  const servicio = crearServicioPedidos(repositorio)

  await servicio.crearPedido({
    contacto,
    modalidad: 'RETIRO',
    items: [
      { productoId: 'p1', cantidad: 2 },
      { productoId: 'p2', cantidad: 1 },
    ],
  })

  const { pedido, items } = captura.transaccion
  assert.equal(pedido.subtotal, 26796)
  assert.equal(pedido.descuento, 5326)
  assert.equal(pedido.costoEnvio, 0)
  assert.equal(pedido.total, 21470)
  assert.equal(pedido.estado, 'PENDIENTE')
  assert.deepEqual(items[0], {
    productoId: 'p1', nombre: 'Aceite', sku: 'ACE',
    precioNormal: 10653, precioFinal: 7990, cantidad: 2, subtotal: 15980,
  })
})

test('no aplica descuento si la oferta no está vigente', async () => {
  const leche = {
    id: 'p1', sku: 'LE', nombre: 'Leche', precio: 4290, precioAnterior: 5720,
    stock: 10, stockReservado: 0, tieneOfertaVigente: false,
  }
  const { repositorio, captura } = crearRepoFalso([leche])
  const servicio = crearServicioPedidos(repositorio)

  await servicio.crearPedido({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId: 'p1', cantidad: 1 }],
  })

  assert.equal(captura.transaccion.pedido.descuento, 0)
  assert.equal(captura.transaccion.items[0].precioNormal, 4290)
})

test('cobra el envío según modalidad y comuna', async () => {
  const { repositorio, captura } = crearRepoFalso([CAFE])
  const servicio = crearServicioPedidos(repositorio)

  await servicio.crearPedido({
    contacto,
    modalidad: 'DESPACHO',
    direccion: { calle: 'Av. Providencia 1234', comuna: 'Providencia', region: 'RM' },
    items: [{ productoId: 'p2', cantidad: 1 }],
  })

  const { pedido } = captura.transaccion
  assert.equal(pedido.costoEnvio, 2990)
  assert.equal(pedido.total, 5490 + 2990)
  assert.equal(pedido.dirComuna, 'Providencia')
})

test('rechaza un producto no disponible', async () => {
  const { repositorio } = crearRepoFalso([]) // el repo no devuelve el producto
  const servicio = crearServicioPedidos(repositorio)

  await assert.rejects(
    servicio.crearPedido({
      contacto,
      modalidad: 'RETIRO',
      items: [{ productoId: 'fantasma', cantidad: 1 }],
    }),
    (error) => error instanceof ErrorPedido && error.code === 'PRODUCT_NOT_AVAILABLE',
  )
})

test('rechaza si la cantidad supera el stock disponible', async () => {
  const casiAgotado = {
    id: 'p1', sku: 'LE', nombre: 'Leche', precio: 4290, precioAnterior: null,
    stock: 5, stockReservado: 4, tieneOfertaVigente: false, // disponible = 1
  }
  const { repositorio } = crearRepoFalso([casiAgotado])
  const servicio = crearServicioPedidos(repositorio)

  await assert.rejects(
    servicio.crearPedido({
      contacto,
      modalidad: 'RETIRO',
      items: [{ productoId: 'p1', cantidad: 2 }],
    }),
    (error) => error instanceof ErrorPedido && error.code === 'INSUFFICIENT_STOCK',
  )
})

test('delega la persistencia en una sola transacción y devuelve su resultado', async () => {
  const { repositorio, captura } = crearRepoFalso([CAFE])
  const servicio = crearServicioPedidos(repositorio)

  const creado = await servicio.crearPedido({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId: 'p2', cantidad: 1 }],
  })

  assert.equal(captura.llamadas, 1)
  assert.equal(creado.numero, 1)
  assert.equal(creado.estado, 'PENDIENTE')
})
