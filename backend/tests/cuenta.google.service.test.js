import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCuenta, ErrorCuenta } from '../src/modules/cuenta/cuenta.service.js'
import { crearHashContrasena } from '../src/modules/auth/contrasena.js'

// Datos que devolvería el verificador real de Google tras validar el ID token.
const PERFIL_GOOGLE = {
  googleId: 'g-sub-123',
  email: 'wilnes@gmail.com',
  emailVerificado: true,
  nombre: 'Wilnes Devil',
}

// Repositorio falso configurable: cada test define solo lo que necesita y captura
// las llamadas relevantes.
function repoFalso(overrides = {}) {
  return {
    async buscarClienteActivoPorGoogleId() {
      return null
    },
    async buscarClienteActivoPorEmail() {
      return null
    },
    async crearClienteGoogle(datos) {
      return { id: 'nuevo', telefono: null, ...datos }
    },
    async enlazarGoogle(id, googleId) {
      return { id, googleId, nombre: 'Existente', email: PERFIL_GOOGLE.email, telefono: null }
    },
    async crearSesion() {},
    ...overrides,
  }
}

test('iniciarConGoogle: cliente que vuelve (enlazado por googleId) abre sesión sin crear ni enlazar', async () => {
  let creoLlamado = false
  let enlazoLlamado = false
  const servicio = crearServicioCuenta(
    repoFalso({
      async buscarClienteActivoPorGoogleId() {
        return { id: 'c1', nombre: 'Wilnes', email: PERFIL_GOOGLE.email, telefono: null }
      },
      async crearClienteGoogle() {
        creoLlamado = true
      },
      async enlazarGoogle() {
        enlazoLlamado = true
      },
    }),
    { verificarGoogle: async () => PERFIL_GOOGLE },
  )

  const resultado = await servicio.iniciarConGoogle({ idToken: 'tok' })

  assert.ok(resultado.token)
  assert.equal(resultado.cliente.id, 'c1')
  assert.equal(creoLlamado, false)
  assert.equal(enlazoLlamado, false)
})

test('iniciarConGoogle: fusiona por email si existe la cuenta (enlaza googleId, no duplica)', async () => {
  const captura = {}
  const servicio = crearServicioCuenta(
    repoFalso({
      async buscarClienteActivoPorEmail() {
        return { id: 'existente', nombre: 'Wilnes', email: PERFIL_GOOGLE.email, telefono: null }
      },
      async enlazarGoogle(id, googleId) {
        captura.id = id
        captura.googleId = googleId
        return { id, nombre: 'Wilnes', email: PERFIL_GOOGLE.email, telefono: null }
      },
    }),
    { verificarGoogle: async () => PERFIL_GOOGLE },
  )

  const resultado = await servicio.iniciarConGoogle({ idToken: 'tok' })

  assert.equal(captura.id, 'existente')
  assert.equal(captura.googleId, PERFIL_GOOGLE.googleId)
  assert.equal(resultado.cliente.id, 'existente')
})

test('iniciarConGoogle: crea una cuenta solo-Google (sin passwordHash) si nadie coincide', async () => {
  const captura = {}
  const servicio = crearServicioCuenta(
    repoFalso({
      async crearClienteGoogle(datos) {
        captura.datos = datos
        return { id: 'nuevo', telefono: null, ...datos }
      },
    }),
    { verificarGoogle: async () => PERFIL_GOOGLE },
  )

  const resultado = await servicio.iniciarConGoogle({ idToken: 'tok' })

  assert.deepEqual(captura.datos, {
    nombre: PERFIL_GOOGLE.nombre,
    email: PERFIL_GOOGLE.email,
    googleId: PERFIL_GOOGLE.googleId,
  })
  // Nunca se envía passwordHash a una cuenta solo-Google.
  assert.equal('passwordHash' in captura.datos, false)
  assert.equal(resultado.cliente.email, PERFIL_GOOGLE.email)
})

test('iniciarConGoogle: rechaza si el correo de Google no está verificado', async () => {
  let creoLlamado = false
  const servicio = crearServicioCuenta(
    repoFalso({
      async crearClienteGoogle() {
        creoLlamado = true
      },
    }),
    { verificarGoogle: async () => ({ ...PERFIL_GOOGLE, emailVerificado: false }) },
  )

  await assert.rejects(
    servicio.iniciarConGoogle({ idToken: 'tok' }),
    (error) => error instanceof ErrorCuenta && error.code === 'GOOGLE_EMAIL_UNVERIFIED',
  )
  assert.equal(creoLlamado, false)
})

test('iniciarConGoogle: token inválido se traduce a INVALID_GOOGLE_TOKEN', async () => {
  const servicio = crearServicioCuenta(repoFalso(), {
    verificarGoogle: async () => {
      throw new Error('firma inválida')
    },
  })

  await assert.rejects(
    servicio.iniciarConGoogle({ idToken: 'tok-malo' }),
    (error) => error instanceof ErrorCuenta && error.code === 'INVALID_GOOGLE_TOKEN',
  )
})

test('iniciarConGoogle: un correo ya en uso (P2002 al crear) responde EMAIL_TAKEN', async () => {
  const servicio = crearServicioCuenta(
    repoFalso({
      async crearClienteGoogle() {
        throw Object.assign(new Error('unique'), { code: 'P2002' })
      },
    }),
    { verificarGoogle: async () => PERFIL_GOOGLE },
  )

  await assert.rejects(
    servicio.iniciarConGoogle({ idToken: 'tok' }),
    (error) => error instanceof ErrorCuenta && error.code === 'EMAIL_TAKEN',
  )
})

test('iniciarSesion: una cuenta solo-Google (passwordHash null) no entra por contraseña', async () => {
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorEmail() {
      return { id: 'g1', nombre: 'Wilnes', email: PERFIL_GOOGLE.email, telefono: null, passwordHash: null }
    },
    async crearSesion() {
      throw new Error('no debería abrir sesión')
    },
  })

  const resultado = await servicio.iniciarSesion({ email: PERFIL_GOOGLE.email, contrasena: 'cualquiera-larga' })
  assert.equal(resultado, null)
})

test('cambiarContrasena: una cuenta solo-Google no puede cambiar la contraseña (no tiene actual)', async () => {
  const passwordHash = await crearHashContrasena('IrrelevanteAqui!')
  void passwordHash
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorId() {
      return { id: 'g1', passwordHash: null }
    },
  })

  await assert.rejects(
    servicio.cambiarContrasena('g1', { contrasenaActual: 'x'.repeat(12), contrasenaNueva: 'y'.repeat(12) }, 'tok'),
    (error) => error instanceof ErrorCuenta && error.code === 'INVALID_CURRENT_PASSWORD',
  )
})
