import test from 'node:test'
import assert from 'node:assert/strict'
import { opcionesCookieSesion } from '../src/lib/cookies.js'

// Estas pruebas manipulan variables de entorno; se restauran al terminar cada una.
function conEntorno(vars, fn) {
  const previo = {}
  for (const [clave, valor] of Object.entries(vars)) {
    previo[clave] = process.env[clave]
    if (valor === undefined) delete process.env[clave]
    else process.env[clave] = valor
  }
  try {
    return fn()
  } finally {
    for (const [clave, valor] of Object.entries(previo)) {
      if (valor === undefined) delete process.env[clave]
      else process.env[clave] = valor
    }
  }
}

test('por defecto (dev): Lax y sin Secure', () => {
  conEntorno({ COOKIE_CROSS_SITE: undefined, NODE_ENV: 'test' }, () => {
    const opciones = opcionesCookieSesion()
    assert.equal(opciones.httpOnly, true)
    assert.equal(opciones.sameSite, 'lax')
    assert.equal(opciones.secure, false)
    assert.equal(opciones.path, '/')
  })
})

test('cross-site: None + Secure (obligatorio para viajar entre dominios)', () => {
  conEntorno({ COOKIE_CROSS_SITE: 'true', NODE_ENV: 'test' }, () => {
    const opciones = opcionesCookieSesion()
    assert.equal(opciones.sameSite, 'none')
    assert.equal(opciones.secure, true)
  })
})

test('producción sin cross-site: Secure pero sigue Lax', () => {
  conEntorno({ COOKIE_CROSS_SITE: undefined, NODE_ENV: 'production' }, () => {
    const opciones = opcionesCookieSesion()
    assert.equal(opciones.sameSite, 'lax')
    assert.equal(opciones.secure, true)
  })
})

test('extra se fusiona (p. ej. maxAge)', () => {
  conEntorno({ COOKIE_CROSS_SITE: undefined, NODE_ENV: 'test' }, () => {
    const opciones = opcionesCookieSesion({ maxAge: 1000 })
    assert.equal(opciones.maxAge, 1000)
    assert.equal(opciones.httpOnly, true)
  })
})
