import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearTokenSesion,
  crearVencimientoSesion,
  hashTokenSesion,
} from '../src/modules/auth/sesion.js'

test('cada sesión recibe un token aleatorio', () => {
  const primerToken = crearTokenSesion()
  const segundoToken = crearTokenSesion()

  assert.notEqual(primerToken, segundoToken)
  assert.ok(primerToken.length >= 40)
})

test('el hash de sesión es estable y no expone el token', () => {
  const token = 'token-de-prueba'

  assert.equal(hashTokenSesion(token), hashTokenSesion(token))
  assert.notEqual(hashTokenSesion(token), token)
  assert.notEqual(hashTokenSesion(token), hashTokenSesion('otro-token'))
})

test('una sesión vence siete días después de crearse', () => {
  const ahora = new Date('2026-08-02T12:00:00.000Z')

  assert.equal(
    crearVencimientoSesion(ahora).toISOString(),
    '2026-08-09T12:00:00.000Z',
  )
})
