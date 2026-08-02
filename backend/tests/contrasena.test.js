import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearHashContrasena,
  verificarContrasena,
  validarContrasenaNueva,
} from '../src/modules/auth/contrasena.js'

test('crea un hash que permite verificar la contraseña correcta', async () => {
  const contrasena = 'Clave-de-prueba-2026'
  const hash = await crearHashContrasena(contrasena)

  assert.notEqual(hash, contrasena)
  assert.equal(await verificarContrasena(hash, contrasena), true)
})

test('rechaza una contraseña diferente', async () => {
  const hash = await crearHashContrasena('Clave-de-prueba-2026')

  assert.equal(await verificarContrasena(hash, 'clave-incorrecta'), false)
})

test('rechaza contraseñas nuevas más cortas que doce caracteres', () => {
  assert.throws(
    () => validarContrasenaNueva('corta-123'),
    /entre 12 y 128 caracteres/,
  )
})

test('crearHashContrasena aplica la política antes de generar el hash', () => {
  assert.throws(() => crearHashContrasena('corta-123'), /entre 12 y 128 caracteres/)
})
