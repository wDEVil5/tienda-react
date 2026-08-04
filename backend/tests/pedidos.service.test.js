import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioPedidos, ErrorPedido } from '../src/modules/pedidos/pedidos.service.js'
import { REGLAS_POR_DEFECTO } from '../src/lib/reglasTienda.js'

const contacto = {
  nombre: 'Camila R.',
  email: 'camila@correo.cl',
  telefono: '+56 9 8765 4321',
}

// Opciones falsas: mantienen estos tests unitarios (sin tocar la base ni enviar
// correos). Las reglas usan los valores por defecto que asumen las aserciones;
// el notificador es no-op porque la confirmación se prueba aparte.
const reglasFalsas = {
  obtenerReglas: async () => REGLAS_POR_DEFECTO,
  notificador: { async enviarConfirmacion() {} },
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

test('enlaza el clienteId recibido y usa null por defecto (invitado)', async () => {
  const { repositorio, captura } = crearRepoFalso([CAFE])
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  await servicio.crearPedido(
    { contacto, modalidad: 'RETIRO', items: [{ productoId: 'p2', cantidad: 1 }] },
    { clienteId: 'cli-9' },
  )
  assert.equal(captura.transaccion.pedido.clienteId, 'cli-9')

  await servicio.crearPedido({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId: 'p2', cantidad: 1 }],
  })
  assert.equal(captura.transaccion.pedido.clienteId, null)
})

test('recalcula precios y totales en el servidor (retiro)', async () => {
  const { repositorio, captura } = crearRepoFalso([ACEITE, CAFE])
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

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
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

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
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

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
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

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
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  await assert.rejects(
    servicio.crearPedido({
      contacto,
      modalidad: 'RETIRO',
      items: [{ productoId: 'p1', cantidad: 2 }],
    }),
    (error) => error instanceof ErrorPedido && error.code === 'INSUFFICIENT_STOCK',
  )
})

test('cotizarPedido calcula totales sin validar stock', async () => {
  const agotado = {
    id: 'p1', sku: 'LE', nombre: 'Leche', precio: 4290, precioAnterior: 5720,
    stock: 0, stockReservado: 0, tieneOfertaVigente: true, // sin stock
  }
  const { repositorio } = crearRepoFalso([agotado])
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  // cantidad 1 con stock 0: crear fallaría, pero cotizar solo calcula montos.
  const cotizacion = await servicio.cotizarPedido({
    modalidad: 'DESPACHO',
    comuna: 'Providencia',
    items: [{ productoId: 'p1', cantidad: 1 }],
  })

  assert.equal(cotizacion.subtotal, 5720)
  assert.equal(cotizacion.descuento, 1430)
  assert.equal(cotizacion.costoEnvio, 2990)
  assert.equal(cotizacion.total, 7280)
  assert.equal(cotizacion.items[0].subtotal, 4290)
})

test('cotizarPedido rechaza un producto no disponible', async () => {
  const { repositorio } = crearRepoFalso([])
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  await assert.rejects(
    servicio.cotizarPedido({ modalidad: 'RETIRO', items: [{ productoId: 'fantasma', cantidad: 1 }] }),
    (error) => error instanceof ErrorPedido && error.code === 'PRODUCT_NOT_AVAILABLE',
  )
})

test('delega la persistencia en una sola transacción y devuelve su resultado', async () => {
  const { repositorio, captura } = crearRepoFalso([CAFE])
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  const creado = await servicio.crearPedido({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId: 'p2', cantidad: 1 }],
  })

  assert.equal(captura.llamadas, 1)
  assert.equal(creado.numero, 1)
  assert.equal(creado.estado, 'PENDIENTE')
})

test('crearPedido dispara la confirmación por correo con el pedido creado', async () => {
  const { repositorio } = crearRepoFalso([CAFE])
  let pedidoNotificado
  const servicio = crearServicioPedidos(repositorio, {
    obtenerReglas: async () => REGLAS_POR_DEFECTO,
    notificador: {
      async enviarConfirmacion(pedido) { pedidoNotificado = pedido },
    },
  })

  const creado = await servicio.crearPedido({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId: 'p2', cantidad: 1 }],
  })

  assert.equal(pedidoNotificado.numero, creado.numero)
  assert.equal(pedidoNotificado.contactoEmail, 'camila@correo.cl')
})

test('un fallo al enviar la confirmación no rompe la creación del pedido', async () => {
  const { repositorio, captura } = crearRepoFalso([CAFE])
  const servicio = crearServicioPedidos(repositorio, {
    obtenerReglas: async () => REGLAS_POR_DEFECTO,
    notificador: {
      async enviarConfirmacion() { throw new Error('proveedor caído') },
    },
  })

  const creado = await servicio.crearPedido({
    contacto,
    modalidad: 'RETIRO',
    items: [{ productoId: 'p2', cantidad: 1 }],
  })

  // La compra se persistió igual; el fallo del correo quedó aislado.
  assert.equal(captura.llamadas, 1)
  assert.equal(creado.numero, 1)
})

test('listarPedidos entrega resumen paginado con conteos de productos y unidades', async () => {
  const servicio = crearServicioPedidos({
    async listar() {
      return [{
        id: 'ped-1', numero: 1, estado: 'ENTREGADO', modalidad: 'DESPACHO',
        contactoNombre: 'Wilnes A.', dirComuna: 'Providencia', total: 21470,
        createdAt: new Date('2026-07-30T10:00:00.000Z'),
        items: [{ cantidad: 2 }, { cantidad: 1 }],
      }]
    },
    async contar() { return 1 },
  })

  const resultado = await servicio.listarPedidos({ page: 1, limit: 20 })

  assert.deepEqual(resultado.meta, { page: 1, limit: 20, total: 1, totalPages: 1 })
  assert.equal(resultado.data[0].cantidadProductos, 2)
  assert.equal(resultado.data[0].cantidadUnidades, 3)
  assert.equal(resultado.data[0].comuna, 'Providencia')
  assert.deepEqual(resultado.data[0].previsualizaciones, [])
})

test('obtenerDetallePedido arma la ficha con timeline y sin dirección en retiro', async () => {
  const servicio = crearServicioPedidos({
    async obtenerPorId() {
      return {
        id: 'ped-1', numero: 1, estado: 'ENTREGADO', modalidad: 'RETIRO',
        contactoNombre: 'Wilnes A.', contactoEmail: 'w@correo.cl', contactoTelefono: '+56 9',
        dirCalle: null, dirDepto: null, dirComuna: null, dirRegion: null, dirInstrucciones: null,
        subtotal: 26796, descuento: 5326, costoEnvio: 0, total: 21470,
        createdAt: new Date('2026-07-30T10:00:00.000Z'),
        items: [{ nombre: 'Aceite', sku: 'ACE', cantidad: 2, precioNormal: 10653, precioFinal: 7990, subtotal: 15980 }],
        eventos: [
          { estado: 'PENDIENTE', nota: null, createdAt: new Date('2026-07-27T10:00:00.000Z') },
          { estado: 'ENTREGADO', nota: null, createdAt: new Date('2026-07-29T10:00:00.000Z') },
        ],
      }
    },
  })

  const detalle = await servicio.obtenerDetallePedido('ped-1')

  assert.equal(detalle.direccion, null)
  assert.equal(detalle.items[0].nombre, 'Aceite')
  assert.equal(detalle.items[0].productoActual, null)
  assert.equal(detalle.eventos.length, 2)
  assert.equal(detalle.eventos[1].estado, 'ENTREGADO')
  assert.deepEqual(detalle.pagos, [])
})

test('obtenerDetallePedido devuelve null cuando el pedido no existe', async () => {
  const servicio = crearServicioPedidos({ async obtenerPorId() { return null } })

  assert.equal(await servicio.obtenerDetallePedido('fantasma'), null)
})

const PEDIDO_PENDIENTE = {
  id: 'ped-1', numero: 1, estado: 'PENDIENTE', modalidad: 'RETIRO',
  contactoNombre: 'W', contactoEmail: 'w@c.cl', contactoTelefono: '+56',
  dirCalle: null, dirDepto: null, dirComuna: null, dirRegion: null, dirInstrucciones: null,
  subtotal: 5490, descuento: 0, costoEnvio: 0, total: 5490,
  createdAt: new Date('2026-08-02T10:00:00.000Z'),
  items: [{ productoId: 'prod-1', nombre: 'Café', sku: 'CAFE', cantidad: 1, precioNormal: 5490, precioFinal: 5490, subtotal: 5490 }],
  eventos: [],
}

function crearRepoEstado(pedido) {
  const captura = { cambio: null, llamadas: 0 }
  const repositorio = {
    async obtenerPorId() { return pedido },
    async cambiarEstadoTransaccional(datos) {
      captura.cambio = datos
      captura.llamadas += 1
      return { ...pedido, estado: datos.nuevoEstado, eventos: [] }
    },
  }
  return { repositorio, captura }
}

test('cambiarEstadoPedido acepta una transición válida y consume la reserva', async () => {
  const { repositorio, captura } = crearRepoEstado(PEDIDO_PENDIENTE)
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  const detalle = await servicio.cambiarEstadoPedido('ped-1', 'PREPARANDO', 'A preparar')

  assert.equal(captura.llamadas, 1)
  assert.equal(captura.cambio.nuevoEstado, 'PREPARANDO')
  assert.equal(captura.cambio.efecto, 'CONSUMIR')
  assert.equal(captura.cambio.nota, 'A preparar')
  assert.equal(detalle.estado, 'PREPARANDO')
})

test('cambiarEstadoPedido rechaza una transición inválida sin tocar el repositorio', async () => {
  const { repositorio, captura } = crearRepoEstado(PEDIDO_PENDIENTE)
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  await assert.rejects(
    servicio.cambiarEstadoPedido('ped-1', 'ENTREGADO'),
    (error) => error instanceof ErrorPedido && error.code === 'INVALID_ORDER_TRANSITION',
  )
  assert.equal(captura.llamadas, 0)
})

test('cambiarEstadoPedido cancela un pedido ya aceptado restituyendo stock', async () => {
  const { repositorio, captura } = crearRepoEstado({ ...PEDIDO_PENDIENTE, estado: 'PREPARANDO' })
  const servicio = crearServicioPedidos(repositorio, reglasFalsas)

  await servicio.cambiarEstadoPedido('ped-1', 'CANCELADO')

  assert.equal(captura.cambio.efecto, 'RESTITUIR')
})

test('cambiarEstadoPedido devuelve null cuando el pedido no existe', async () => {
  const servicio = crearServicioPedidos({ async obtenerPorId() { return null } })

  assert.equal(await servicio.cambiarEstadoPedido('fantasma', 'PREPARANDO'), null)
})

test('listarPedidosDeCliente acota por clienteId y arma la meta', async () => {
  let filtrosListar
  let filtrosContar
  const servicio = crearServicioPedidos({
    async listar(filtros) {
      filtrosListar = filtros
      return [
        {
          id: 'p1', numero: 1, estado: 'ENVIADO', modalidad: 'DESPACHO',
          contactoNombre: 'Wilnes', dirComuna: 'Ñuñoa',
          items: [{ cantidad: 2 }], total: 1000, createdAt: new Date(),
        },
      ]
    },
    async contar(filtros) {
      filtrosContar = filtros
      return 1
    },
  })

  const resultado = await servicio.listarPedidosDeCliente('cli-1', { page: 1, limit: 20 })

  assert.equal(filtrosListar.clienteId, 'cli-1')
  assert.equal(filtrosContar.clienteId, 'cli-1')
  assert.equal(resultado.meta.total, 1)
  assert.equal(resultado.data[0].numero, 1)
  assert.equal(resultado.data[0].cantidadUnidades, 2)
})

test('obtenerPedidoDeCliente pasa el clienteId y devuelve null si no es suyo', async () => {
  let recibido
  const servicioAjeno = crearServicioPedidos({
    async obtenerPorId(id, opciones) {
      recibido = { id, opciones }
      return null
    },
  })
  assert.equal(await servicioAjeno.obtenerPedidoDeCliente('cli-1', 'p9'), null)
  assert.equal(recibido.opciones.clienteId, 'cli-1')

  const servicioPropio = crearServicioPedidos({
    async obtenerPorId() {
      return {
        id: 'p1', numero: 5, estado: 'ENTREGADO', modalidad: 'RETIRO',
        contactoNombre: 'W', contactoEmail: 'w@c.cl', contactoTelefono: 'x',
        dirCalle: null, dirDepto: null, dirComuna: null, dirRegion: null, dirInstrucciones: null,
        subtotal: 0, descuento: 0, costoEnvio: 0, total: 0,
        items: [], eventos: [], createdAt: new Date(),
      }
    },
  })
  const detalle = await servicioPropio.obtenerPedidoDeCliente('cli-1', 'p1')
  assert.equal(detalle.numero, 5)
})
