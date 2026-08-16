import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioNewsletter, ErrorNewsletter } from '../src/modules/newsletter/newsletter.service.js'

// Notificador falso: registra si se pidió la bienvenida, sin enviar nada.
function crearNotificadorFalso(overrides = {}) {
  const llamadas = []
  return {
    llamadas,
    async enviarBienvenida(suscriptor) {
      llamadas.push(suscriptor)
    },
    ...overrides,
  }
}

// Repositorio en memoria: por defecto el correo no existe. Cada prueba
// sobrescribe solo lo que necesita para ejercer una rama concreta.
function crearRepositorioFalso(overrides = {}) {
  return {
    async buscarPorEmail() {
      return null
    },
    async crear(datos) {
      return { id: 's1', estado: 'ACTIVO', token: 't1', ...datos }
    },
    async reactivar(id, { clienteId }) {
      return { id, clienteId, email: 'ana@correo.cl', estado: 'ACTIVO', token: 't1', bajaEn: null }
    },
    async darDeBaja() {
      return { id: 's1', email: 'ana@correo.cl', estado: 'BAJA' }
    },
    ...overrides,
  }
}

function crearServicio(repoOverrides = {}, notificador = crearNotificadorFalso()) {
  return {
    servicio: crearServicioNewsletter(crearRepositorioFalso(repoOverrides), { notificador }),
    notificador,
  }
}

test('suscribir crea el suscriptor y envía la bienvenida', async () => {
  let recibido
  const { servicio, notificador } = crearServicio({
    async crear(datos) {
      recibido = datos
      return { id: 's1', estado: 'ACTIVO', token: 't1', ...datos }
    },
  })

  const suscriptor = await servicio.suscribir({ email: 'ana@correo.cl', clienteId: 'c1' })

  assert.equal(suscriptor.estado, 'ACTIVO')
  assert.equal(recibido.email, 'ana@correo.cl')
  assert.equal(recibido.clienteId, 'c1')
  assert.equal(notificador.llamadas.length, 1)
  assert.equal(notificador.llamadas[0].email, 'ana@correo.cl')
})

test('suscribir falla con ALREADY_SUBSCRIBED y NO envía bienvenida si ya está activo', async () => {
  const { servicio, notificador } = crearServicio({
    async buscarPorEmail() {
      return { id: 's1', estado: 'ACTIVO' }
    },
  })

  await assert.rejects(
    servicio.suscribir({ email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorNewsletter && error.code === 'ALREADY_SUBSCRIBED',
  )
  assert.equal(notificador.llamadas.length, 0)
})

test('suscribir reactiva un correo dado de baja y envía la bienvenida', async () => {
  const { servicio, notificador } = crearServicio({
    async buscarPorEmail() {
      return { id: 's1', estado: 'BAJA' }
    },
  })

  const suscriptor = await servicio.suscribir({ email: 'ana@correo.cl', clienteId: 'c9' })

  assert.equal(suscriptor.estado, 'ACTIVO')
  assert.equal(notificador.llamadas.length, 1)
})

test('suscribir traduce una carrera (P2002) a ALREADY_SUBSCRIBED', async () => {
  const { servicio } = crearServicio({
    async crear() {
      throw Object.assign(new Error('unique'), { code: 'P2002' })
    },
  })

  await assert.rejects(
    servicio.suscribir({ email: 'ana@correo.cl' }),
    (error) => error instanceof ErrorNewsletter && error.code === 'ALREADY_SUBSCRIBED',
  )
})

test('una bienvenida que falla NO rompe la suscripción (fire-and-forget)', async () => {
  const notificador = crearNotificadorFalso({
    async enviarBienvenida() {
      throw new Error('proveedor caído')
    },
  })
  const { servicio } = crearServicio({}, notificador)

  const suscriptor = await servicio.suscribir({ email: 'ana@correo.cl' })
  assert.equal(suscriptor.estado, 'ACTIVO')
})

test('darDeBaja marca BAJA cuando el token existe', async () => {
  const { servicio } = crearServicio()

  const suscriptor = await servicio.darDeBaja({ token: 't1' })

  assert.equal(suscriptor.estado, 'BAJA')
})

test('darDeBaja falla con SUBSCRIPTION_NOT_FOUND si el token no existe', async () => {
  const { servicio } = crearServicio({
    async darDeBaja() {
      return null
    },
  })

  await assert.rejects(
    servicio.darDeBaja({ token: 'inexistente' }),
    (error) => error instanceof ErrorNewsletter && error.code === 'SUBSCRIPTION_NOT_FOUND',
  )
})

test('obtenerEstadoSuscripcion es true solo si el correo está ACTIVO', async () => {
  const activo = crearServicio({ async buscarPorEmail() { return { id: 's1', estado: 'ACTIVO' } } })
  const baja = crearServicio({ async buscarPorEmail() { return { id: 's1', estado: 'BAJA' } } })
  const ausente = crearServicio()

  assert.equal(await activo.servicio.obtenerEstadoSuscripcion('ana@correo.cl'), true)
  assert.equal(await baja.servicio.obtenerEstadoSuscripcion('ana@correo.cl'), false)
  assert.equal(await ausente.servicio.obtenerEstadoSuscripcion('ana@correo.cl'), false)
})

test('establecerSuscripcion activo=true crea y envía bienvenida si no existía', async () => {
  const { servicio, notificador } = crearServicio()
  await servicio.establecerSuscripcion({ email: 'ana@correo.cl', clienteId: 'c1', activo: true })
  assert.equal(notificador.llamadas.length, 1)
})

test('establecerSuscripcion activo=true es idempotente si ya está ACTIVO (sin bienvenida)', async () => {
  const { servicio, notificador } = crearServicio({
    async buscarPorEmail() { return { id: 's1', estado: 'ACTIVO' } },
  })
  await servicio.establecerSuscripcion({ email: 'ana@correo.cl', activo: true })
  assert.equal(notificador.llamadas.length, 0)
})

test('establecerSuscripcion activo=false da de baja por email si estaba ACTIVO', async () => {
  let bajaEmail
  const { servicio } = crearServicio({
    async buscarPorEmail() { return { id: 's1', email: 'ana@correo.cl', estado: 'ACTIVO' } },
    async darDeBajaPorEmail(email) { bajaEmail = email; return { id: 's1', estado: 'BAJA' } },
  })
  await servicio.establecerSuscripcion({ email: 'ana@correo.cl', activo: false })
  assert.equal(bajaEmail, 'ana@correo.cl')
})

test('establecerSuscripcion activo=false no hace nada si no estaba suscrito', async () => {
  let llamada = false
  const { servicio } = crearServicio({
    async darDeBajaPorEmail() { llamada = true; return null },
  })
  const resultado = await servicio.establecerSuscripcion({ email: 'ana@correo.cl', activo: false })
  assert.equal(llamada, false)
  assert.equal(resultado, null)
})
