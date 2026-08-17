import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioResenas, ErrorResena } from '../src/modules/resenas/resenas.service.js'

const PRODUCTO = '11111111-1111-4111-8111-111111111111'
const CLIENTE = '22222222-2222-4222-8222-222222222222'

test('listar mapea autor (primer nombre) y esMia, y calcula el promedio a un decimal', async () => {
  const servicio = crearServicioResenas({
    repositorio: {
      async listarPorProducto() {
        return [
          { id: 'r1', calificacion: 5, titulo: 'Excelente', cuerpo: 'Muy bueno', createdAt: new Date(), clienteId: CLIENTE, cliente: { nombre: 'Ramón Pérez' } },
          { id: 'r2', calificacion: 1, titulo: 'Mal', cuerpo: 'Verde', createdAt: new Date(), clienteId: 'otro', cliente: { nombre: 'Katherine Soto' } },
        ]
      },
      async contarPorProducto() { return 5 },
      async obtenerAgregado() { return { resenaSuma: 17, resenaConteo: 5 } },
    },
  })

  const resultado = await servicio.listar({ productoId: PRODUCTO, clienteId: CLIENTE })

  assert.equal(resultado.data[0].autor, 'Ramón')
  assert.equal(resultado.data[0].esMia, true)
  assert.equal(resultado.data[1].esMia, false)
  assert.equal(resultado.meta.promedio, 3.4)
  assert.equal(resultado.meta.conteo, 5)
})

test('listar sin reseñas deja el promedio en null', async () => {
  const servicio = crearServicioResenas({
    repositorio: {
      async listarPorProducto() { return [] },
      async contarPorProducto() { return 0 },
      async obtenerAgregado() { return { resenaSuma: 0, resenaConteo: 0 } },
    },
  })

  const resultado = await servicio.listar({ productoId: PRODUCTO })

  assert.equal(resultado.meta.promedio, null)
  assert.equal(resultado.meta.conteo, 0)
})

test('guardar rechaza con PURCHASE_REQUIRED si el cliente no compró el producto', async () => {
  let guardo = false
  const servicio = crearServicioResenas({
    repositorio: {
      async clienteCompro() { return false },
      async guardarConAgregado() { guardo = true },
    },
  })

  await assert.rejects(
    servicio.guardar({ productoId: PRODUCTO, clienteId: CLIENTE, calificacion: 5 }),
    (error) => error instanceof ErrorResena && error.code === 'PURCHASE_REQUIRED',
  )
  assert.equal(guardo, false)
})

test('guardar persiste la reseña cuando hay compra verificada', async () => {
  let recibido
  const servicio = crearServicioResenas({
    repositorio: {
      async clienteCompro() { return true },
      async guardarConAgregado(datos) {
        recibido = datos
        return { id: 'r9', calificacion: datos.calificacion, titulo: datos.titulo, cuerpo: datos.cuerpo }
      },
    },
  })

  const resena = await servicio.guardar({ productoId: PRODUCTO, clienteId: CLIENTE, calificacion: 4, titulo: 'Bueno', cuerpo: null })

  assert.equal(recibido.clienteId, CLIENTE)
  assert.equal(resena.id, 'r9')
  assert.equal(resena.calificacion, 4)
})

test('estadoParaCliente informa elegibilidad y la reseña propia', async () => {
  const servicio = crearServicioResenas({
    repositorio: {
      async clienteCompro() { return true },
      async obtenerDeCliente() { return { id: 'r1', calificacion: 3 } },
    },
  })

  const estado = await servicio.estadoParaCliente({ productoId: PRODUCTO, clienteId: CLIENTE })

  assert.equal(estado.puedeResenar, true)
  assert.equal(estado.resena.id, 'r1')
})

test('eliminarPropia devuelve eliminada según lo que borró el repositorio', async () => {
  const servicio = crearServicioResenas({
    repositorio: { async eliminarPropiaConAgregado() { return PRODUCTO } },
  })
  assert.deepEqual(await servicio.eliminarPropia({ id: 'r1', clienteId: CLIENTE }), { eliminada: true })

  const servicioNada = crearServicioResenas({
    repositorio: { async eliminarPropiaConAgregado() { return null } },
  })
  assert.deepEqual(await servicioNada.eliminarPropia({ id: 'r1', clienteId: CLIENTE }), { eliminada: false })
})
