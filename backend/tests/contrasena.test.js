import test from 'node:test'
import assert from 'node:assert/strict'
import {
  crearHashContrasena,
  verificarContrasena,
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
