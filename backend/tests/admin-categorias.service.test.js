import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCategoriasAdmin } from '../src/modules/admin/admin-categorias.service.js'

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
