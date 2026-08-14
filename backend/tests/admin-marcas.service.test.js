import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioMarcasAdmin } from '../src/modules/admin/admin-marcas.service.js'

test('listarMarcas incluye logo y productos asignados', async () => {
  const servicio = crearServicioMarcasAdmin({
    async listar() {
      return [{
        id: 'marca-1', nombre: 'Café', slug: 'cafe', logoUrl: 'https://cdn.test/logo.webp',
        logoStorageKey: 'sumarket/marcas/cafe', brandfetchDomain: 'cafe.test', _count: { productos: 2 },
      }]
    },
  })

  const resultado = await servicio.listarMarcas()

  assert.deepEqual(resultado.data, [{
    id: 'marca-1', nombre: 'Café', slug: 'cafe', logoUrl: 'https://cdn.test/logo.webp', brandfetchDomain: 'cafe.test', productosAsignados: 2,
  }])
})

test('crearMarca genera slug, normaliza el dominio Brandfetch y no asigna un logo manualmente', async () => {
  let datosCreacion
  const servicio = crearServicioMarcasAdmin({
    async crear(datos) { datosCreacion = datos; return { id: 'marca-1', ...datos, logoUrl: null } },
  })

  const marca = await servicio.crearMarca({ nombre: 'Café Central', brandfetchDomain: 'CAFECLUB.CL' })

  assert.equal(datosCreacion.slug, 'cafe-central')
  assert.equal(datosCreacion.brandfetchDomain, 'cafeclub.cl')
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
