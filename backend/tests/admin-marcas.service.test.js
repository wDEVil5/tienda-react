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

test('actualizarDominioBrandfetch permite limpiar o cambiar el dominio de una marca existente', async () => {
  let dominioRecibido
  const servicio = crearServicioMarcasAdmin({
    async obtenerPorId() { return { id: 'marca-1' } },
    async actualizarDominioBrandfetch(_id, dominio) {
      dominioRecibido = dominio
      return { id: 'marca-1', brandfetchDomain: dominio }
    },
  })

  await servicio.actualizarDominioBrandfetch('marca-1', 'NESTLE.COM')
  assert.equal(dominioRecibido, 'nestle.com')
  await servicio.actualizarDominioBrandfetch('marca-1', null)
  assert.equal(dominioRecibido, null)
})

test('eliminarMarca borra la marca y su logo cuando no tiene productos', async () => {
  const eliminadas = []
  const logosEliminados = []
  const servicio = crearServicioMarcasAdmin(
    {
      async obtenerConConteo() {
        return { id: 'marca-1', logoStorageKey: 'sumarket/marcas/cafe', _count: { productos: 0 } }
      },
      async eliminar(id) { eliminadas.push(id) },
    },
    { async eliminarLogoMarca(clave) { logosEliminados.push(clave) } },
  )

  const resultado = await servicio.eliminarMarca('marca-1')

  assert.deepEqual(resultado, { id: 'marca-1', reasignados: 0 })
  assert.deepEqual(eliminadas, ['marca-1'])
  assert.deepEqual(logosEliminados, ['sumarket/marcas/cafe'])
})

test('eliminarMarca sin reasignar borra aunque tenga productos (quedan sin marca)', async () => {
  const eliminadas = []
  let reasigno = false
  const servicio = crearServicioMarcasAdmin(
    {
      async obtenerConConteo() {
        return { id: 'marca-1', logoStorageKey: null, _count: { productos: 3 } }
      },
      async eliminar(id) { eliminadas.push(id) },
      async reasignarYEliminar() { reasigno = true },
    },
    { async eliminarLogoMarca() {} },
  )

  const resultado = await servicio.eliminarMarca('marca-1')

  assert.deepEqual(resultado, { id: 'marca-1', reasignados: 0 })
  assert.deepEqual(eliminadas, ['marca-1'])
  assert.equal(reasigno, false)
})

test('eliminarMarca reasigna los productos a otra marca y luego borra', async () => {
  const reasignaciones = []
  let borradoDirecto = false
  const servicio = crearServicioMarcasAdmin(
    {
      async obtenerConConteo(id) {
        if (id === 'marca-1') return { id: 'marca-1', logoStorageKey: null, _count: { productos: 3 } }
        return { id, logoStorageKey: null, _count: { productos: 0 } }
      },
      async eliminar() { borradoDirecto = true },
      async reasignarYEliminar(id, destino) { reasignaciones.push([id, destino]) },
    },
    { async eliminarLogoMarca() {} },
  )

  const resultado = await servicio.eliminarMarca('marca-1', { reasignarA: 'marca-2' })

  assert.deepEqual(resultado, { id: 'marca-1', reasignados: 3 })
  assert.deepEqual(reasignaciones, [['marca-1', 'marca-2']])
  assert.equal(borradoDirecto, false)
})

test('eliminarMarca rechaza si la marca destino no existe', async () => {
  const servicio = crearServicioMarcasAdmin({
    async obtenerConConteo(id) {
      if (id === 'marca-1') return { id: 'marca-1', logoStorageKey: null, _count: { productos: 2 } }
      return null
    },
    async reasignarYEliminar() { throw new Error('no debería llamarse') },
  })

  await assert.rejects(
    () => servicio.eliminarMarca('marca-1', { reasignarA: 'inexistente' }),
    (error) => error.code === 'REASSIGN_TARGET_NOT_FOUND',
  )
})

test('eliminarMarca devuelve null cuando la marca no existe', async () => {
  const servicio = crearServicioMarcasAdmin({
    async obtenerConConteo() { return null },
  })

  assert.equal(await servicio.eliminarMarca('inexistente'), null)
})
