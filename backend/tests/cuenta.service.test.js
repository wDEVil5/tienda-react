import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioCuenta, ErrorCuenta } from '../src/modules/cuenta/cuenta.service.js'
import { crearHashContrasena } from '../src/modules/auth/contrasena.js'

const CLAVE = 'Cliente2026!'

test('registrar hashea la clave, guarda solo el hash del token y abre sesión', async () => {
  const captura = { creado: null, sesion: null }
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorEmail() {
      return null
    },
    async crearCliente(datos) {
      captura.creado = datos
      return { id: 'c1', ...datos }
    },
    async crearSesion(datos) {
      captura.sesion = datos
    },
  })

  const resultado = await servicio.registrar({ nombre: 'Wilnes', email: 'w@c.cl', contrasena: CLAVE })

  assert.ok(resultado.token)
  assert.equal(resultado.cliente.email, 'w@c.cl')
  // La contraseña se guarda hasheada, nunca en texto plano.
  assert.notEqual(captura.creado.passwordHash, CLAVE)
  // La base recibe el hash del token, no el token que va en la cookie.
  assert.ok(captura.sesion.tokenHash)
  assert.notEqual(captura.sesion.tokenHash, resultado.token)
})

test('registrar rechaza un correo ya registrado', async () => {
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorEmail() {
      return { id: 'existe' }
    },
  })

  await assert.rejects(
    servicio.registrar({ nombre: 'W', email: 'w@c.cl', contrasena: CLAVE }),
    (error) => error instanceof ErrorCuenta && error.code === 'EMAIL_TAKEN',
  )
})

test('iniciarSesion devuelve null con contraseña incorrecta', async () => {
  const passwordHash = await crearHashContrasena(CLAVE)
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorEmail() {
      return { id: 'c1', nombre: 'W', email: 'w@c.cl', telefono: null, passwordHash }
    },
    async crearSesion() {},
  })

  const resultado = await servicio.iniciarSesion({ email: 'w@c.cl', contrasena: 'otra-clave-larga' })
  assert.equal(resultado, null)
})

test('iniciarSesion abre sesión con credenciales válidas', async () => {
  const passwordHash = await crearHashContrasena(CLAVE)
  let sesionGuardada = null
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorEmail() {
      return { id: 'c1', nombre: 'W', email: 'w@c.cl', telefono: null, passwordHash }
    },
    async crearSesion(datos) {
      sesionGuardada = datos
    },
  })

  const resultado = await servicio.iniciarSesion({ email: 'w@c.cl', contrasena: CLAVE })

  assert.ok(resultado.token)
  assert.equal(resultado.cliente.id, 'c1')
  assert.equal(sesionGuardada.clienteId, 'c1')
})
