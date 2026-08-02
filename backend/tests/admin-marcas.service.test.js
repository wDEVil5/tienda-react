import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioMarcasAdmin } from '../src/modules/admin/admin-marcas.service.js'

test('crearMarca genera slug y no asigna un logo manualmente', async () => {
  let datosCreacion
  const servicio = crearServicioMarcasAdmin({
    async crear(datos) { datosCreacion = datos; return { id: 'marca-1', ...datos, logoUrl: null } },
  })

  const marca = await servicio.crearMarca({ nombre: 'Café Central' })

  assert.equal(datosCreacion.slug, 'cafe-central')
  assert.equal(marca.logoUrl, null)
})
