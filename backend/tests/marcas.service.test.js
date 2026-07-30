import test from 'node:test'
import assert from 'node:assert/strict'
import { listarMarcas } from '../src/modules/marcas/marcas.service.js'

test('listarMarcas deriva marcas de productos publicados', () => {
  const resultado = listarMarcas()

  assert.deepEqual(resultado, [
    {
      id: 'marca_cafe_barrio',
      nombre: 'Café del Barrio',
      logoUrl: null,
      productCount: 1,
    },
    {
      id: 'marca_campo_sur',
      nombre: 'Campo Sur',
      logoUrl: null,
      productCount: 2,
    },
    {
      id: 'marca_hogar_claro',
      nombre: 'Hogar Claro',
      logoUrl: null,
      productCount: 1,
    },
    {
      id: 'marca_valle_oliva',
      nombre: 'Valle Oliva',
      logoUrl: null,
      productCount: 1,
    },
  ])
})
