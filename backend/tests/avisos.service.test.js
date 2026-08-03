import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioAvisos, ErrorAviso } from '../src/modules/avisos/avisos.service.js'

// Repositorio en memoria: producto agotado, sin aviso previo. Cada prueba
// sobrescribe solo lo que necesita para ejercer una rama concreta.
function crearRepositorioFalso(overrides = {}) {
  return {
    async buscarProductoPublicadoPorSlug() {
      return { id: 'p1', stock: 0, stockReservado: 0 }
    },
    async buscarAviso() {
      return null
    },
    async crear(datos) {
      return { id: 'a1', creadoEn: new Date('2026-08-02T00:00:00Z'), ...datos }
    },
    async reactivar(id, { clienteId }) {
      return { id, clienteId, listoEn: null, notificadoEn: null }
    },
    ...overrides,
  }
}

test('suscribir crea el aviso cuando el producto está agotado', async () => {
  let recibido
  const servicio = crearServicioAvisos(
    crearRepositorioFalso({
      async crear(datos) {
        recibido = datos
        return { id: 'a1', creadoEn: new Date(), ...datos }
      },
    }),
  )

  const aviso = await servicio.suscribir({ slug: 'leche', email: 'ana@correo.cl', clienteId: 'c1' })

  assert.equal(aviso.productoId, 'p1')
  assert.equal(recibido.email, 'ana@correo.cl')
  assert.equal(recibido.clienteId, 'c1')
})

test('suscribir falla con PRODUCT_NOT_FOUND si el producto no existe', async () => {
  const servicio = crearServicioAvisos(
    crearRepositorioFalso({ async buscarProductoPublicadoPorSlug() { return null } }),
  )

  await assert.rejects(
    servicio.suscribir({ slug: 'fantasma', email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorAviso && error.code === 'PRODUCT_NOT_FOUND',
  )
})

test('suscribir falla con PRODUCT_AVAILABLE si todavía hay stock', async () => {
  let creo = false
  const servicio = crearServicioAvisos(
    crearRepositorioFalso({
      async buscarProductoPublicadoPorSlug() { return { id: 'p1', stock: 5, stockReservado: 1 } },
      async crear() { creo = true },
    }),
  )

  await assert.rejects(
    servicio.suscribir({ slug: 'leche', email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorAviso && error.code === 'PRODUCT_AVAILABLE',
  )
  assert.equal(creo, false)
})

test('suscribir falla con ALREADY_SUBSCRIBED si ya hay un aviso pendiente', async () => {
  const servicio = crearServicioAvisos(
    crearRepositorioFalso({
      async buscarAviso() {
        return { id: 'a1', notificadoEn: null, listoEn: null }
      },
    }),
  )

  await assert.rejects(
    servicio.suscribir({ slug: 'leche', email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorAviso && error.code === 'ALREADY_SUBSCRIBED',
  )
})

test('suscribir reactiva un aviso ya notificado cuando el producto se agota otra vez', async () => {
  let reactivado
  const servicio = crearServicioAvisos(
    crearRepositorioFalso({
      async buscarAviso() {
        return { id: 'a1', notificadoEn: new Date(), listoEn: new Date() }
      },
      async reactivar(id, datos) {
        reactivado = { id, ...datos }
        return { id, ...datos, listoEn: null, notificadoEn: null }
      },
    }),
  )

  const aviso = await servicio.suscribir({ slug: 'leche', email: 'ana@correo.cl', clienteId: 'c9' })

  assert.equal(reactivado.id, 'a1')
  assert.equal(reactivado.clienteId, 'c9')
  assert.equal(aviso.notificadoEn, null)
})

test('suscribir traduce una carrera (P2002) a ALREADY_SUBSCRIBED', async () => {
  const servicio = crearServicioAvisos(
    crearRepositorioFalso({
      async crear() {
        throw Object.assign(new Error('unique'), { code: 'P2002' })
      },
    }),
  )

  await assert.rejects(
    servicio.suscribir({ slug: 'leche', email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorAviso && error.code === 'ALREADY_SUBSCRIBED',
  )
})
