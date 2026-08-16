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

test('actualizarPerfil modifica solo datos públicos del cliente de sesión', async () => {
  let actualizacion = null
  const servicio = crearServicioCuenta({
    async actualizarPerfilCliente(clienteId, datos) {
      actualizacion = { clienteId, datos }
      return {
        id: clienteId,
        nombre: datos.nombre,
        email: 'cliente@correo.cl',
        telefono: datos.telefono,
        passwordHash: 'nunca se expone',
      }
    },
  })

  const resultado = await servicio.actualizarPerfil('c1', {
    nombre: 'Wilnes Actualizado',
    telefono: '+56 9 1234 5678',
  })

  assert.deepEqual(actualizacion, {
    clienteId: 'c1',
    datos: { nombre: 'Wilnes Actualizado', telefono: '+56 9 1234 5678' },
  })
  assert.deepEqual(resultado, {
    id: 'c1',
    nombre: 'Wilnes Actualizado',
    email: 'cliente@correo.cl',
    telefono: '+56 9 1234 5678',
  })
})

test('cambiarContrasena verifica la actual y revoca solo las otras sesiones', async () => {
  const passwordHash = await crearHashContrasena(CLAVE)
  let cambio = null
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorId() {
      return { id: 'c1', passwordHash }
    },
    async actualizarContrasenaYRevocarOtrasSesiones(datos) {
      cambio = datos
    },
  })

  await servicio.cambiarContrasena(
    'c1',
    { contrasenaActual: CLAVE, contrasenaNueva: 'Nueva clave segura 2026' },
    'sesion-actual',
    new Date('2026-08-04T12:00:00Z'),
  )

  assert.equal(cambio.clienteId, 'c1')
  assert.ok(cambio.passwordHash)
  assert.notEqual(cambio.passwordHash, 'Nueva clave segura 2026')
  assert.ok(cambio.tokenHashActual)
  assert.equal(cambio.ahora.toISOString(), '2026-08-04T12:00:00.000Z')
})

test('cambiarContrasena rechaza una contraseña actual incorrecta sin guardar nada', async () => {
  const passwordHash = await crearHashContrasena(CLAVE)
  const servicio = crearServicioCuenta({
    async buscarClienteActivoPorId() {
      return { id: 'c1', passwordHash }
    },
    async actualizarContrasenaYRevocarOtrasSesiones() {
      throw new Error('no debería llamarse')
    },
  })

  await assert.rejects(
    servicio.cambiarContrasena(
      'c1',
      { contrasenaActual: 'clave equivocada', contrasenaNueva: 'Nueva clave segura 2026' },
      'sesion-actual',
    ),
    (error) => error instanceof ErrorCuenta && error.code === 'INVALID_CURRENT_PASSWORD',
  )
})

test('cerrarTodasLasSesiones revoca solo las sesiones vigentes del cliente', async () => {
  let recibido = null
  const servicio = crearServicioCuenta({
    async revocarTodasLasSesiones(clienteId, ahora) {
      recibido = { clienteId, ahora }
      return { count: 3 }
    },
  })
  const ahora = new Date('2026-08-04T12:00:00Z')

  const resultado = await servicio.cerrarTodasLasSesiones('c1', ahora)

  assert.deepEqual(recibido, { clienteId: 'c1', ahora })
  assert.deepEqual(resultado, { count: 3 })
})

test('eliminarCuenta borra al cliente por su id', async () => {
  let recibido = null
  const servicio = crearServicioCuenta({
    async eliminarCliente(clienteId) {
      recibido = clienteId
      return { id: clienteId }
    },
  })

  const resultado = await servicio.eliminarCuenta('c1')

  assert.equal(recibido, 'c1')
  assert.deepEqual(resultado, { id: 'c1' })
})
