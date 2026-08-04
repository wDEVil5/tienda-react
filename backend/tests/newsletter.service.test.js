import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioNewsletter, ErrorNewsletter } from '../src/modules/newsletter/newsletter.service.js'

// Repositorio en memoria: por defecto el correo no existe. Cada prueba
// sobrescribe solo lo que necesita para ejercer una rama concreta.
function crearRepositorioFalso(overrides = {}) {
  return {
    async buscarPorEmail() {
      return null
    },
    async crear(datos) {
      return { id: 's1', estado: 'ACTIVO', ...datos }
    },
    async reactivar(id, { clienteId }) {
      return { id, clienteId, estado: 'ACTIVO', bajaEn: null }
    },
    ...overrides,
  }
}

test('suscribir crea el suscriptor cuando el correo no existe', async () => {
  let recibido
  const servicio = crearServicioNewsletter(
    crearRepositorioFalso({
      async crear(datos) {
        recibido = datos
        return { id: 's1', estado: 'ACTIVO', ...datos }
      },
    }),
  )

  const suscriptor = await servicio.suscribir({ email: 'ana@correo.cl', clienteId: 'c1' })

  assert.equal(suscriptor.estado, 'ACTIVO')
  assert.equal(recibido.email, 'ana@correo.cl')
  assert.equal(recibido.clienteId, 'c1')
})

test('suscribir falla con ALREADY_SUBSCRIBED si el correo ya está activo', async () => {
  let creo = false
  const servicio = crearServicioNewsletter(
    crearRepositorioFalso({
      async buscarPorEmail() {
        return { id: 's1', estado: 'ACTIVO' }
      },
      async crear() {
        creo = true
      },
    }),
  )

  await assert.rejects(
    servicio.suscribir({ email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorNewsletter && error.code === 'ALREADY_SUBSCRIBED',
  )
  assert.equal(creo, false)
})

test('suscribir reactiva un correo que se había dado de baja', async () => {
  let reactivado
  const servicio = crearServicioNewsletter(
    crearRepositorioFalso({
      async buscarPorEmail() {
        return { id: 's1', estado: 'BAJA' }
      },
      async reactivar(id, datos) {
        reactivado = { id, ...datos }
        return { id, estado: 'ACTIVO', bajaEn: null, ...datos }
      },
    }),
  )

  const suscriptor = await servicio.suscribir({ email: 'ana@correo.cl', clienteId: 'c9' })

  assert.equal(reactivado.id, 's1')
  assert.equal(reactivado.clienteId, 'c9')
  assert.equal(suscriptor.estado, 'ACTIVO')
})

test('suscribir traduce una carrera (P2002) a ALREADY_SUBSCRIBED', async () => {
  const servicio = crearServicioNewsletter(
    crearRepositorioFalso({
      async crear() {
        throw Object.assign(new Error('unique'), { code: 'P2002' })
      },
    }),
  )

  await assert.rejects(
    servicio.suscribir({ email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorNewsletter && error.code === 'ALREADY_SUBSCRIBED',
  )
})
