import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioReferenciasAdmin } from '../src/modules/admin/admin-referencias.service.js'

test('listarOpcionesProducto reúne las referencias necesarias para el editor', async () => {
  const servicio = crearServicioReferenciasAdmin({
    async listarCategoriasActivas() {
      return [{ id: 'cat-1', nombre: 'Despensa', slug: 'despensa' }]
    },
    async listarSubcategoriasActivas() {
      return [{ id: 'sub-1', nombre: 'Café', slug: 'despensa-cafe', categoriaId: 'cat-1' }]
    },
    async listarSubcategoriasHijasActivas() {
      return [{ id: 'hija-1', nombre: 'Café en grano', slug: 'despensa-cafe-grano', subcategoriaId: 'sub-1' }]
    },
    async listarMarcas() {
      return [{ id: 'marca-1', nombre: 'Olivos', slug: 'olivos', logoUrl: null }]
    },
    async listarEtiquetas() {
      return [{ id: 'etiqueta-1', nombre: 'Vegano', slug: 'vegano' }]
    },
  })

  const resultado = await servicio.listarOpcionesProducto()

  assert.deepEqual(resultado.data.categorias, [
    { id: 'cat-1', nombre: 'Despensa', slug: 'despensa' },
  ])
  assert.equal(resultado.data.subcategorias[0].categoriaId, 'cat-1')
  assert.equal(resultado.data.subcategoriasHijas[0].subcategoriaId, 'sub-1')
  assert.equal(resultado.data.marcas[0].nombre, 'Olivos')
  assert.equal(resultado.data.etiquetas[0].slug, 'vegano')
})
