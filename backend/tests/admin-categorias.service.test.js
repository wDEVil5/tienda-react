import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCategoriasAdmin } from '../src/modules/admin/admin-categorias.service.js'

test('desactivarCategoria impide ocultar una categoría con productos', async () => {
  const servicio = crearServicioCategoriasAdmin({
    async obtenerPorId() { return { id: 'cat-1', _count: { productos: 2 } } },
  })

  await assert.rejects(
    servicio.desactivarCategoria('cat-1'),
    { code: 'CATEGORY_HAS_PRODUCTS' },
  )
})

test('desactivarCategoria oculta una categoría sin productos', async () => {
  let datosActualizacion
  const servicio = crearServicioCategoriasAdmin({
    async obtenerPorId() { return { id: 'cat-1', _count: { productos: 0 } } },
    async actualizarPorId(_id, datos) {
      datosActualizacion = datos
      return { id: 'cat-1', activa: false }
    },
  })

  const categoria = await servicio.desactivarCategoria('cat-1')

  assert.deepEqual(datosActualizacion, { activa: false })
  assert.equal(categoria.activa, false)
})

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
