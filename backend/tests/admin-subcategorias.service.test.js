import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ErrorSubcategoriaAdmin,
  crearServicioSubcategoriasAdmin,
} from '../src/modules/admin/admin-subcategorias.service.js'

function crearRepoFalso({ categoria = { id: 'cat1', slug: 'despensa' }, subcategorias = [] } = {}) {
  const porId = new Map(subcategorias.map((s) => [s.id, s]))
  const capturado = { creado: null, actualizado: null, eliminado: null }
  const repositorio = {
    async obtenerCategoria(id) {
      return categoria && categoria.id === id ? categoria : null
    },
    async listarPorCategoria() {
      return subcategorias
    },
    async obtenerPorId(id) {
      return porId.get(id) ?? null
    },
    async crear(datos) {
      capturado.creado = datos
      return { id: 'nueva', ...datos }
    },
    async actualizarPorId(id, datos) {
      capturado.actualizado = { id, datos }
      return { ...porId.get(id), ...datos }
    },
    async eliminar(id) {
      capturado.eliminado = id
    },
  }
  return { repositorio, capturado }
}

test('crear prefija el slug con el de la categoría', async () => {
  const { repositorio, capturado } = crearRepoFalso()
  const servicio = crearServicioSubcategoriasAdmin(repositorio)

  const sub = await servicio.crear('cat1', { nombre: 'Café y Cafeteras' })
  assert.equal(capturado.creado.slug, 'despensa-cafe-y-cafeteras')
  assert.equal(capturado.creado.categoriaId, 'cat1')
  assert.equal(sub.id, 'nueva')
})

test('crear devuelve null si la categoría no existe', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioSubcategoriasAdmin(repositorio)
  assert.equal(await servicio.crear('inexistente', { nombre: 'X' }), null)
})

test('actualizar regenera el slug solo si cambia el nombre', async () => {
  const { repositorio, capturado } = crearRepoFalso({
    subcategorias: [{ id: 's1', categoriaId: 'cat1', nombre: 'Leches', slug: 'despensa-leches', orden: 0, activa: true, _count: { productos: 0 } }],
  })
  const servicio = crearServicioSubcategoriasAdmin(repositorio)

  await servicio.actualizar('s1', { nombre: 'Leches y Cremas' })
  assert.equal(capturado.actualizado.datos.slug, 'despensa-leches-y-cremas')

  capturado.actualizado = null
  await servicio.actualizar('s1', { orden: 3 })
  assert.equal('slug' in capturado.actualizado.datos, false)
})

test('eliminar rechaza si tiene productos y borra si no', async () => {
  const conProductos = crearRepoFalso({
    subcategorias: [{ id: 's1', categoriaId: 'cat1', nombre: 'Leches', slug: 'x', orden: 0, activa: true, _count: { productos: 2 } }],
  })
  const servicio1 = crearServicioSubcategoriasAdmin(conProductos.repositorio)
  await assert.rejects(() => servicio1.eliminar('s1'), ErrorSubcategoriaAdmin)

  const sinProductos = crearRepoFalso({
    subcategorias: [{ id: 's2', categoriaId: 'cat1', nombre: 'Quesos', slug: 'y', orden: 0, activa: true, _count: { productos: 0 } }],
  })
  const servicio2 = crearServicioSubcategoriasAdmin(sinProductos.repositorio)
  assert.equal(await servicio2.eliminar('s2'), true)
  assert.equal(sinProductos.capturado.eliminado, 's2')
})

test('eliminar devuelve false si no existe', async () => {
  const { repositorio } = crearRepoFalso()
  const servicio = crearServicioSubcategoriasAdmin(repositorio)
  assert.equal(await servicio.eliminar('nope'), false)
})
