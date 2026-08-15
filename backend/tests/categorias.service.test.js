import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCategorias } from '../src/modules/categorias/categorias.service.js'

test('listarCategorias adapta categorías, cuenta productos y conserva la taxonomía de tres niveles', async () => {
  const repositorio = {
    async listarConProductosPublicados() {
      return [
        {
          id: 'cat_despensa',
          nombre: 'Despensa',
          slug: 'despensa',
          subcategorias: [{
            id: 'sub_cafe',
            nombre: 'Café',
            slug: 'despensa-cafe',
            subcategoriasHijas: [{ id: 'hija_grano', nombre: 'Café en grano', slug: 'cafe-en-grano' }],
          }],
          _count: { productos: 2 },
        },
        { id: 'cat_lacteos', nombre: 'Lácteos', slug: 'lacteos', subcategorias: [], _count: { productos: 2 } },
        { id: 'cat_limpieza', nombre: 'Limpieza', slug: 'limpieza', subcategorias: [], _count: { productos: 1 } },
      ]
    },
  }
  const servicio = crearServicioCategorias(repositorio)
  const resultado = await servicio.listarCategorias()

  assert.deepEqual(resultado, [
    {
      id: 'cat_despensa',
      nombre: 'Despensa',
      slug: 'despensa',
      subcategorias: [{
        id: 'sub_cafe',
        nombre: 'Café',
        slug: 'despensa-cafe',
        subcategoriasHijas: [{ id: 'hija_grano', nombre: 'Café en grano', slug: 'cafe-en-grano' }],
      }],
      productCount: 2,
    },
    { id: 'cat_lacteos', nombre: 'Lácteos', slug: 'lacteos', subcategorias: [], productCount: 2 },
    { id: 'cat_limpieza', nombre: 'Limpieza', slug: 'limpieza', subcategorias: [], productCount: 1 },
  ])
})
