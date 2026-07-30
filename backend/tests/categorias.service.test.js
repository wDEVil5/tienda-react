import test from 'node:test'
import assert from 'node:assert/strict'
import { listarCategorias } from '../src/modules/categorias/categorias.service.js'

test('listarCategorias deriva categorías y cuenta productos publicados', () => {
  const resultado = listarCategorias()

  assert.deepEqual(resultado, [
    { id: 'cat_despensa', nombre: 'Despensa', slug: 'despensa', productCount: 2 },
    { id: 'cat_lacteos', nombre: 'Lácteos', slug: 'lacteos', productCount: 2 },
    { id: 'cat_limpieza', nombre: 'Limpieza', slug: 'limpieza', productCount: 1 },
  ])
})
