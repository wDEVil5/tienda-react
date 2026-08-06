import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearServicioRecuperacion,
  ErrorRecuperacion,
} from '../src/modules/recuperacion/recuperacion.service.js'
import { hashTokenRecuperacion } from '../src/modules/recuperacion/recuperacion.token.js'
import { plantillaRecuperacion } from '../src/modules/recuperacion/recuperacion.notificaciones.js'

// Fakes de dominio (clientes), repositorio de tokens y notificador. Registran lo
// recibido para verificar el comportamiento sin tocar BD ni correo real.
function crearFakes({ sujeto = null, tokenGuardado = null } = {}) {
  const registros = { tokens: [], correos: [], restablecidas: [], usados: [] }
  const dominio = {
    campoTitular: 'clienteId',
    async buscarActivoPorEmail(email) {
      return sujeto && sujeto.email === email ? sujeto : null
    },
    async restablecerContrasena(datos) {
      registros.restablecidas.push(datos)
    },
  }
  const repositorio = {
    async crearToken(datos) {
      registros.tokens.push(datos)
      return { id: 'tok-1', ...datos }
    },
    async buscarTokenVigentePorHash(hash) {
      return tokenGuardado && tokenGuardado.tokenHash === hash ? tokenGuardado : null
    },
    async marcarUsado(id, ahora) {
      registros.usados.push({ id, ahora })
      return { count: 1 }
    },
  }
  const notificador = {
    async enviarEnlace(datos) {
      registros.correos.push(datos)
    },
  }
  const hashContrasena = async (contrasena) => `hash(${contrasena})`
  return { dominio, repositorio, notificador, hashContrasena, registros }
}

test('solicitar con un correo existente crea el token (hasheado) y envía el enlace', async () => {
  const fakes = crearFakes({ sujeto: { id: 'cli-1', nombre: 'Ana', email: 'ana@correo.cl' } })
  const servicio = crearServicioRecuperacion(fakes)

  const resultado = await servicio.solicitar({ email: 'ana@correo.cl' })

  assert.deepEqual(resultado, { enviado: true })
  assert.equal(fakes.registros.tokens.length, 1)
  assert.equal(fakes.registros.tokens[0].clienteId, 'cli-1') // campoTitular correcto
  assert.equal(fakes.registros.tokens[0].usuarioId, undefined)
  assert.match(fakes.registros.tokens[0].tokenHash, /^[a-f0-9]{64}$/) // guarda el hash, no el token
  assert.equal(fakes.registros.correos.length, 1)
  assert.equal(fakes.registros.correos[0].para, 'ana@correo.cl')
  assert.ok(fakes.registros.correos[0].token) // el token CRUDO viaja al correo, no el hash
  assert.notEqual(fakes.registros.correos[0].token, fakes.registros.tokens[0].tokenHash)
})

test('solicitar con un correo inexistente no crea token ni envía, pero responde igual', async () => {
  const fakes = crearFakes({ sujeto: { id: 'cli-1', nombre: 'Ana', email: 'ana@correo.cl' } })
  const servicio = crearServicioRecuperacion(fakes)

  const resultado = await servicio.solicitar({ email: 'nadie@correo.cl' })

  assert.deepEqual(resultado, { enviado: true }) // respuesta genérica: no revela registro
  assert.equal(fakes.registros.tokens.length, 0)
  assert.equal(fakes.registros.correos.length, 0)
})

test('restablecer con token vigente cambia la clave, marca usado y revoca sesiones', async () => {
  const token = 'token-crudo-abc'
  const tokenGuardado = {
    id: 'tok-1',
    tokenHash: hashTokenRecuperacion(token),
    clienteId: 'cli-1',
    usuarioId: null,
  }
  const fakes = crearFakes({ tokenGuardado })
  const servicio = crearServicioRecuperacion(fakes)

  const resultado = await servicio.restablecer({ token, contrasenaNueva: 'NuevaClave123' })

  assert.deepEqual(resultado, { restablecido: true })
  assert.equal(fakes.registros.restablecidas.length, 1)
  assert.equal(fakes.registros.restablecidas[0].id, 'cli-1')
  assert.equal(fakes.registros.restablecidas[0].passwordHash, 'hash(NuevaClave123)')
  assert.deepEqual(fakes.registros.usados.map((u) => u.id), ['tok-1'])
})

test('restablecer rechaza un token inexistente o vencido (sin revelar cuál)', async () => {
  const fakes = crearFakes({ tokenGuardado: null })
  const servicio = crearServicioRecuperacion(fakes)

  await assert.rejects(
    servicio.restablecer({ token: 'no-existe', contrasenaNueva: 'x' }),
    (error) => error instanceof ErrorRecuperacion && error.codigo === 'INVALID_TOKEN',
  )
  assert.equal(fakes.registros.restablecidas.length, 0)
})

test('restablecer rechaza un token de otro dominio (sin el titular esperado)', async () => {
  const token = 'token-de-staff'
  // Servicio de clientes (campoTitular='clienteId') pero el token es de un Usuario.
  const tokenGuardado = {
    id: 'tok-2',
    tokenHash: hashTokenRecuperacion(token),
    clienteId: null,
    usuarioId: 'usr-1',
  }
  const fakes = crearFakes({ tokenGuardado })
  const servicio = crearServicioRecuperacion(fakes)

  await assert.rejects(
    servicio.restablecer({ token, contrasenaNueva: 'x' }),
    (error) => error instanceof ErrorRecuperacion && error.codigo === 'INVALID_TOKEN',
  )
})

test('la plantilla de recuperación incluye el enlace y saluda por nombre', () => {
  const { asunto, texto, html } = plantillaRecuperacion({
    nombre: 'Ana',
    enlace: 'https://tienda.cl/recuperar?token=abc',
  })

  assert.match(asunto, /contraseña/i)
  assert.match(texto, /Hola Ana/)
  assert.match(texto, /https:\/\/tienda\.cl\/recuperar\?token=abc/)
  assert.match(html, /href="https:\/\/tienda\.cl\/recuperar\?token=abc"/)
})
