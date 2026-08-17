import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioFavoritos, ErrorFavorito } from '../src/modules/favoritos/favoritos.service.js'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

test('listar hidrata los favoritos como tarjetas preservando el orden y expone los ids', async () => {
  let idsPedidos
  const servicio = crearServicioFavoritos({
    repositorio: {
      async listarProductoIds() { return [UUID_A, UUID_B] },
    },
    productos: {
      async listarPublicosPorIds(ids) {
        idsPedidos = ids
        return ids.map((id) => ({ id, nombre: `Producto ${id}` }))
      },
    },
  })

  const resultado = await servicio.listar('cli-1')

  assert.deepEqual(idsPedidos, [UUID_A, UUID_B])
  assert.deepEqual(resultado.ids, [UUID_A, UUID_B])
  assert.equal(resultado.data[0].id, UUID_A)
})

test('agregar guarda el favorito cuando el producto existe y está publicado', async () => {
  let guardado
  const servicio = crearServicioFavoritos({
    repositorio: {
      async existeProductoPublicado() { return true },
      async agregar(clienteId, productoId) { guardado = { clienteId, productoId } },
    },
    productos: {},
  })

  const resultado = await servicio.agregar('cli-1', UUID_A)

  assert.deepEqual(guardado, { clienteId: 'cli-1', productoId: UUID_A })
  assert.deepEqual(resultado, { agregado: true })
})

test('agregar rechaza con PRODUCT_NOT_FOUND si el producto no existe/está publicado', async () => {
  let intento = false
  const servicio = crearServicioFavoritos({
    repositorio: {
      async existeProductoPublicado() { return false },
      async agregar() { intento = true },
    },
    productos: {},
  })

  await assert.rejects(
    servicio.agregar('cli-1', UUID_A),
    (error) => error instanceof ErrorFavorito && error.code === 'PRODUCT_NOT_FOUND',
  )
  assert.equal(intento, false)
})

test('agregar con un id que no es UUID es PRODUCT_NOT_FOUND sin tocar la base', async () => {
  let consultado = false
  const servicio = crearServicioFavoritos({
    repositorio: {
      async existeProductoPublicado() { consultado = true; return true },
      async agregar() {},
    },
    productos: {},
  })

  await assert.rejects(
    servicio.agregar('cli-1', 'no-es-uuid'),
    (error) => error instanceof ErrorFavorito && error.code === 'PRODUCT_NOT_FOUND',
  )
  assert.equal(consultado, false)
})

test('quitar es idempotente y solo llama a la base con un UUID válido', async () => {
  const llamadas = []
  const servicio = crearServicioFavoritos({
    repositorio: {
      async quitar(clienteId, productoId) { llamadas.push({ clienteId, productoId }) },
    },
    productos: {},
  })

  assert.deepEqual(await servicio.quitar('cli-1', UUID_A), { quitado: true })
  assert.deepEqual(await servicio.quitar('cli-1', 'no-es-uuid'), { quitado: true })

  assert.equal(llamadas.length, 1)
  assert.deepEqual(llamadas[0], { clienteId: 'cli-1', productoId: UUID_A })
})
