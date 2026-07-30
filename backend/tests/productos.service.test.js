import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listarProductos,
  obtenerProductoPorSlug,
} from '../src/modules/productos/productos.service.js'

test('listarProductos excluye productos inactivos', () => {
  const resultado = listarProductos()

  assert.equal(resultado.length, 5)
  assert.equal(resultado.some((producto) => producto.slug === 'mermelada-de-frutilla-250-g'), false)
  assert.equal(resultado.every((producto) => !('activo' in producto)), true)
})

test('listarProductos busca sin distinguir mayúsculas ni acentos', () => {
  const resultado = listarProductos({ query: 'CAFÉ' })

  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].slug, 'cafe-de-grano-tostado-250-g')
})

test('listarProductos devuelve copias seguras de los datos', () => {
  const primerResultado = listarProductos()
  primerResultado[0].categoria.nombre = 'Categoría modificada'

  const segundoResultado = listarProductos()

  assert.equal(segundoResultado[0].categoria.nombre, 'Despensa')
})

test('obtenerProductoPorSlug devuelve solo productos publicados', () => {
  const producto = obtenerProductoPorSlug('aceite-oliva-extra-virgen-500-ml')
  const productoInactivo = obtenerProductoPorSlug('mermelada-de-frutilla-250-g')

  assert.equal(producto?.nombre, 'Aceite de oliva extra virgen 500 ml')
  assert.equal(productoInactivo, null)
})
