import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioClientesAdmin } from '../src/modules/admin/admin-clientes.service.js'

// Repo falso: guarda lo que recibe (para afirmar sobre paginación/búsqueda) y
// devuelve datos fijos. Las métricas llegan como el groupBy crudo de Prisma
// (_sum/_count/_max), tal como las consume el servicio.
function crearRepoFalso({
  clientes = [
    { id: 'c1', nombre: 'Ana', email: 'ana@mail.cl', telefono: '900', activo: true, createdAt: new Date('2026-08-01') },
    { id: 'c2', nombre: 'Beto', email: 'beto@mail.cl', telefono: null, activo: true, createdAt: new Date('2026-07-15') },
  ],
  total = 2,
  metricas = [
    { clienteId: 'c1', _sum: { total: 30000 }, _count: 3, _max: { createdAt: new Date('2026-08-10') } },
  ],
} = {}) {
  const capturado = { listar: null, contar: null, metricasIds: null }
  const repositorio = {
    async listar(args) { capturado.listar = args; return clientes },
    async contar(args) { capturado.contar = args; return total },
    async metricasCompra(ids) { capturado.metricasIds = ids; return metricas },
  }
  return { repositorio, capturado }
}

test('listarClientes cruza métricas por cliente y arma la meta de paginación', async () => {
  const { repositorio, capturado } = crearRepoFalso()
  const servicio = crearServicioClientesAdmin(repositorio)

  const { data, meta } = await servicio.listarClientes({ page: 2, limit: 20, query: '  ana  ' })

  // El término se recorta antes de llegar al repositorio.
  assert.equal(capturado.listar.query, 'ana')
  assert.equal(capturado.contar.query, 'ana')
  assert.equal(capturado.listar.page, 2)
  assert.deepEqual(capturado.metricasIds, ['c1', 'c2'])

  // Cliente con métricas: se refleja el gasto y el último pedido.
  assert.equal(data[0].totalGastado, 30000)
  assert.equal(data[0].pedidos, 3)
  assert.deepEqual(data[0].ultimaCompra, new Date('2026-08-10'))

  // Cliente SIN pedidos pagados: cero y sin última compra (no undefined).
  assert.equal(data[1].totalGastado, 0)
  assert.equal(data[1].pedidos, 0)
  assert.equal(data[1].ultimaCompra, null)

  assert.deepEqual(meta, { page: 2, limit: 20, total: 2, totalPages: 1 })
})

test('listarClientes no consulta métricas cuando no hay clientes en la página', async () => {
  const { repositorio, capturado } = crearRepoFalso({ clientes: [], total: 0 })
  const servicio = crearServicioClientesAdmin(repositorio)

  const { data, meta } = await servicio.listarClientes({})

  assert.deepEqual(data, [])
  assert.equal(capturado.metricasIds, null) // no se llamó a metricasCompra
  assert.equal(meta.totalPages, 0)
})

test('obtenerCliente devuelve null cuando no existe', async () => {
  const servicio = crearServicioClientesAdmin({
    async obtenerPorId() { return null },
  })
  assert.equal(await servicio.obtenerCliente('nope'), null)
})

test('obtenerCliente arma la ficha: oculta googleId, expone conGoogle y marca pagados', async () => {
  const repositorio = {
    async obtenerPorId(id) {
      return {
        id,
        nombre: 'Ana',
        email: 'ana@mail.cl',
        telefono: '900',
        activo: true,
        googleId: 'goog-123',
        createdAt: new Date('2026-08-01'),
        updatedAt: new Date('2026-08-05'),
        direcciones: [{ id: 'd1', comuna: 'Maipú', predeterminada: true }],
      }
    },
    async metricasDe() {
      return { totalGastado: 30000, pedidos: 3, ultimaCompra: new Date('2026-08-10') }
    },
    async pedidosDe() {
      return [
        { id: 'p1', numero: 10, estado: 'ENTREGADO', modalidad: 'RETIRO', total: 12000, createdAt: new Date('2026-08-10'), _count: { items: 2 }, pagos: [{ id: 'pago1' }] },
        { id: 'p2', numero: 8, estado: 'PENDIENTE', modalidad: 'DESPACHO', total: 5000, createdAt: new Date('2026-08-02'), _count: { items: 1 }, pagos: [] },
      ]
    },
  }
  const servicio = crearServicioClientesAdmin(repositorio)

  const ficha = await servicio.obtenerCliente('c1')

  assert.equal('googleId' in ficha, false) // nunca se filtra el identificador
  assert.equal(ficha.conGoogle, true)
  assert.equal(ficha.metricas.totalGastado, 30000)
  assert.equal(ficha.pedidos[0].pagado, true)
  assert.equal(ficha.pedidos[0].items, 2)
  assert.equal(ficha.pedidos[1].pagado, false)
})

test('cambiarEstadoCliente devuelve null cuando el cliente no existe', async () => {
  const capturado = { cambiar: null }
  const servicio = crearServicioClientesAdmin({
    async obtenerEstado() { return null },
    async cambiarActivo(...args) { capturado.cambiar = args },
  })

  assert.equal(await servicio.cambiarEstadoCliente('nope', false), null)
  assert.equal(capturado.cambiar, null) // no intenta actualizar si no existe
})

test('cambiarEstadoCliente delega en el repositorio con el nuevo estado', async () => {
  const capturado = { cambiar: null }
  const servicio = crearServicioClientesAdmin({
    async obtenerEstado(id) { return { id, activo: true } },
    async cambiarActivo(id, activo) {
      capturado.cambiar = { id, activo }
      return { id, nombre: 'Ana', email: 'ana@mail.cl', activo }
    },
  })

  const resultado = await servicio.cambiarEstadoCliente('c1', false)

  assert.deepEqual(capturado.cambiar, { id: 'c1', activo: false })
  assert.equal(resultado.activo, false)
})
