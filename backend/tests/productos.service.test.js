import test from 'node:test'
import assert from 'node:assert/strict'
import { listarProductos } from '../src/modules/productos/productos.service.js'

test('listarProductos excluye productos inactivos', () => {
  const resultado = listarProductos()

  assert.equal(resultado.length, 5)
  assert.equal(resultado.some((producto) => producto.slug === 'mermelada-de-frutilla-250-g'), false)
  assert.equal(resultado.every((producto) => !('activo' in producto)), true)
})

test('listarProductos devuelve copias seguras de los datos', () => {
  const primerResultado = listarProductos()
  primerResultado[0].categoria.nombre = 'Categoría modificada'

  const segundoResultado = listarProductos()

  assert.equal(segundoResultado[0].categoria.nombre, 'Despensa')
})
