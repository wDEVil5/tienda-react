import test from 'node:test'
import assert from 'node:assert/strict'
import { validarRegistroCliente } from '../src/modules/cuenta/cuenta.validacion.js'

const base = { nombre: 'Wilnes A.', email: 'nuevo@correo.cl', contrasena: 'Cliente2026!' }

test('acepta un registro válido (teléfono opcional)', () => {
  assert.equal(validarRegistroCliente(base).success, true)
})

test('normaliza el email a minúsculas', () => {
  const resultado = validarRegistroCliente({ ...base, email: 'NUEVO@Correo.CL' })
  assert.equal(resultado.success, true)
  assert.equal(resultado.data.email, 'nuevo@correo.cl')
})

test('rechaza una contraseña corta (menos de 12)', () => {
  assert.equal(validarRegistroCliente({ ...base, contrasena: 'corta123' }).success, false)
})

test('rechaza un email inválido', () => {
  assert.equal(validarRegistroCliente({ ...base, email: 'no-es-email' }).success, false)
})

test('rechaza campos desconocidos (no se puede colar un rol)', () => {
  assert.equal(validarRegistroCliente({ ...base, rol: 'ADMIN' }).success, false)
})
