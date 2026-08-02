import test from 'node:test'
import assert from 'node:assert/strict'
import { crearHashContrasena } from '../src/modules/auth/contrasena.js'
import { crearServicioAuth } from '../src/modules/auth/auth.service.js'
import { hashTokenSesion } from '../src/modules/auth/sesion.js'

test('iniciarSesion crea una sesión y devuelve solo datos públicos', async () => {
  let sesionCreada
  const repositorio = {
    async buscarUsuarioActivoPorEmail() {
      return {
        id: 'usuario-1',
        nombre: 'Wilnes',
        email: 'wilnes@example.test',
        rol: 'ADMIN',
        passwordHash: await crearHashContrasena('Clave-de-prueba-2026'),
      }
    },
    async crearSesion(datos) {
      sesionCreada = datos
    },
  }
  const servicio = crearServicioAuth(repositorio)
  const ahora = new Date('2026-08-02T12:00:00.000Z')

  const resultado = await servicio.iniciarSesion({
    email: 'wilnes@example.test',
    contrasena: 'Clave-de-prueba-2026',
    ahora,
  })

  assert.deepEqual(resultado.usuario, {
    id: 'usuario-1',
    nombre: 'Wilnes',
    email: 'wilnes@example.test',
    rol: 'ADMIN',
  })
  assert.equal(sesionCreada.usuarioId, 'usuario-1')
  assert.equal(sesionCreada.tokenHash, hashTokenSesion(resultado.token))
  assert.equal(sesionCreada.expiraEn.toISOString(), '2026-08-09T12:00:00.000Z')
  assert.equal('passwordHash' in resultado.usuario, false)
})

test('iniciarSesion no crea sesión con una contraseña incorrecta', async () => {
  let creoSesion = false
  const repositorio = {
    async buscarUsuarioActivoPorEmail() {
      return {
        id: 'usuario-1',
        passwordHash: await crearHashContrasena('Clave-correcta-2026'),
      }
    },
    async crearSesion() {
      creoSesion = true
    },
  }
  const servicio = crearServicioAuth(repositorio)

  const resultado = await servicio.iniciarSesion({
    email: 'wilnes@example.test',
    contrasena: 'Clave-incorrecta-2026',
  })

  assert.equal(resultado, null)
  assert.equal(creoSesion, false)
})

test('obtenerSesionActiva devuelve solo el usuario de una sesión vigente', async () => {
  let hashConsultado
  let fechaConsultada
  const repositorio = {
    async buscarSesionActivaPorHash(hash, ahora) {
      hashConsultado = hash
      fechaConsultada = ahora
      return {
        usuario: {
          id: 'usuario-1',
          nombre: 'Wilnes',
          email: 'wilnes@example.test',
          rol: 'ADMIN',
          passwordHash: 'no-debe-salir',
        },
      }
    },
  }
  const servicio = crearServicioAuth(repositorio)
  const ahora = new Date('2026-08-02T12:00:00.000Z')

  const resultado = await servicio.obtenerSesionActiva('token-de-prueba', ahora)

  assert.equal(hashConsultado, hashTokenSesion('token-de-prueba'))
  assert.equal(fechaConsultada, ahora)
  assert.equal(resultado.usuario.email, 'wilnes@example.test')
  assert.equal('passwordHash' in resultado.usuario, false)
})
