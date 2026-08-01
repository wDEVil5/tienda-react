import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioMarcas } from '../src/modules/marcas/marcas.service.js'

test('listarMarcas adapta marcas y cuenta productos publicados', async () => {
  const repositorio = {
    async listarConProductosPublicados() {
      return [
        { id: 'marca_cafe_barrio', nombre: 'Café del Barrio', slug: 'cafe-del-barrio', logoUrl: null, _count: { productos: 1 } },
        { id: 'marca_campo_sur', nombre: 'Campo Sur', slug: 'campo-sur', logoUrl: null, _count: { productos: 2 } },
        { id: 'marca_hogar_claro', nombre: 'Hogar Claro', slug: 'hogar-claro', logoUrl: null, _count: { productos: 1 } },
        { id: 'marca_valle_oliva', nombre: 'Valle Oliva', slug: 'valle-oliva', logoUrl: null, _count: { productos: 1 } },
      ]
    },
  }
  const servicio = crearServicioMarcas(repositorio)
  const resultado = await servicio.listarMarcas()

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
