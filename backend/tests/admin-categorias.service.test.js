import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCategoriasAdmin } from '../src/modules/admin/admin-categorias.service.js'

test('listarCategorias incluye estado y productos asignados', async () => {
  const servicio = crearServicioCategoriasAdmin({
    async listar() {
      return [{ id: 'cat-1', nombre: 'Despensa', slug: 'despensa', activa: false, _count: { productos: 3 } }]
    },
  })

  const resultado = await servicio.listarCategorias()

  assert.deepEqual(resultado.data, [
    { id: 'cat-1', nombre: 'Despensa', slug: 'despensa', activa: false, productosAsignados: 3 },
  ])
})

test('crearCategoria genera slug y deja activa la nueva categoría', async () => {
  let datosCreacion
  const servicio = crearServicioCategoriasAdmin({
    async crear(datos) { datosCreacion = datos; return { id: 'cat-1', ...datos } },
  })

  const categoria = await servicio.crearCategoria({ nombre: 'Productos congelados' })

  assert.equal(datosCreacion.slug, 'productos-congelados')
  assert.equal(datosCreacion.activa, true)
  assert.equal(categoria.nombre, 'Productos congelados')
})
