import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listarProductos,
  obtenerProductoPorSlug,
} from '../src/modules/productos/productos.service.js'

test('listarProductos excluye productos inactivos', () => {
  const { data: resultado } = listarProductos()

  assert.equal(resultado.length, 5)
  assert.equal(resultado.some((producto) => producto.slug === 'mermelada-de-frutilla-250-g'), false)
  assert.equal(resultado.every((producto) => !('activo' in producto)), true)
})

test('listarProductos busca sin distinguir mayúsculas ni acentos', () => {
  const { data: resultado } = listarProductos({ query: 'CAFÉ' })

  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].slug, 'cafe-de-grano-tostado-250-g')
})

test('listarProductos filtra y combina categorías por slug', () => {
  const { data: resultado } = listarProductos({ query: 'leche', categoria: 'LÁCTEOS' })

  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].slug, 'leche-entera-1-l')
})

test('listarProductos filtra productos con oferta vigente', () => {
  const { data: resultado } = listarProductos({ soloOfertas: true })

  assert.equal(resultado.length, 2)
  assert.equal(resultado.every((producto) => producto.precioAnterior !== null), true)
})

test('listarProductos devuelve copias seguras de los datos', () => {
  const { data: primerResultado } = listarProductos()
  primerResultado[0].categoria.nombre = 'Categoría modificada'

  const { data: segundoResultado } = listarProductos()

  assert.equal(segundoResultado[0].categoria.nombre, 'Despensa')
})

test('listarProductos pagina después de aplicar filtros', () => {
  const resultado = listarProductos({ page: 2, limit: 2 })

  assert.equal(resultado.data.length, 2)
  assert.deepEqual(resultado.meta, {
    page: 2,
    limit: 2,
    total: 5,
    totalPages: 3,
  })
})

test('obtenerProductoPorSlug devuelve solo productos publicados', () => {
  const producto = obtenerProductoPorSlug('aceite-oliva-extra-virgen-500-ml')
  const productoInactivo = obtenerProductoPorSlug('mermelada-de-frutilla-250-g')

  assert.equal(producto?.nombre, 'Aceite de oliva extra virgen 500 ml')
  assert.equal(productoInactivo, null)
})
