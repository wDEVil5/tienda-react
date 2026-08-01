import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCategorias } from '../src/modules/categorias/categorias.service.js'

test('listarCategorias adapta categorías y cuenta productos publicados', async () => {
  const repositorio = {
    async listarConProductosPublicados() {
      return [
        { id: 'cat_despensa', nombre: 'Despensa', slug: 'despensa', _count: { productos: 2 } },
        { id: 'cat_lacteos', nombre: 'Lácteos', slug: 'lacteos', _count: { productos: 2 } },
        { id: 'cat_limpieza', nombre: 'Limpieza', slug: 'limpieza', _count: { productos: 1 } },
      ]
    },
  }
  const servicio = crearServicioCategorias(repositorio)
  const resultado = await servicio.listarCategorias()

  assert.deepEqual(resultado, [
    { id: 'cat_despensa', nombre: 'Despensa', slug: 'despensa', productCount: 2 },
    { id: 'cat_lacteos', nombre: 'Lácteos', slug: 'lacteos', productCount: 2 },
    { id: 'cat_limpieza', nombre: 'Limpieza', slug: 'limpieza', productCount: 1 },
  ])
})
