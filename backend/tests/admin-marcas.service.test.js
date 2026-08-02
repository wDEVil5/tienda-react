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

test('asignarLogoMarca reemplaza el recurso anterior después de actualizar la marca', async () => {
  const clavesEliminadas = []
  const servicio = crearServicioMarcasAdmin({
    async obtenerPorId() { return { id: 'marca-1', logoStorageKey: 'sumarket/marcas/anterior' } },
    async actualizarLogo(_id, logo) {
      return { id: 'marca-1', logoUrl: logo.url, logoStorageKey: logo.storageKey }
    },
  }, {
    async eliminarLogoMarca(clave) { clavesEliminadas.push(clave) },
  })

  const marca = await servicio.asignarLogoMarca('marca-1', {
    url: 'https://cdn.ejemplo.test/logo.webp', storageKey: 'sumarket/marcas/nuevo',
  })

  assert.equal(marca.logoStorageKey, 'sumarket/marcas/nuevo')
  assert.deepEqual(clavesEliminadas, ['sumarket/marcas/anterior'])
})
