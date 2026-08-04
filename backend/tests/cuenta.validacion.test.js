import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validarActualizacionPerfilCliente,
  validarCambioContrasenaCliente,
  validarRegistroCliente,
} from '../src/modules/cuenta/cuenta.validacion.js'

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

test('acepta nombre y teléfono al actualizar el perfil', () => {
  const resultado = validarActualizacionPerfilCliente({
    nombre: 'Wilnes Actualizado',
    telefono: '+56 9 1234 5678',
  })

  assert.equal(resultado.success, true)
  assert.equal(resultado.data.nombre, 'Wilnes Actualizado')
})

test('perfil no permite cambiar email ni agregar campos ajenos', () => {
  assert.equal(
    validarActualizacionPerfilCliente({
      nombre: 'Wilnes A.',
      telefono: null,
      email: 'otro@correo.cl',
    }).success,
    false,
  )
})

test('acepta un cambio de contraseña con claves distintas y seguras', () => {
  assert.equal(
    validarCambioContrasenaCliente({
      contrasenaActual: 'Cliente2026!',
      contrasenaNueva: 'Nueva clave segura 2026',
    }).success,
    true,
  )
})

test('rechaza una contraseña nueva corta, igual o con campos extra', () => {
  assert.equal(
    validarCambioContrasenaCliente({
      contrasenaActual: 'Cliente2026!',
      contrasenaNueva: 'corta',
    }).success,
    false,
  )
  assert.equal(
    validarCambioContrasenaCliente({
      contrasenaActual: 'Cliente2026!',
      contrasenaNueva: 'Cliente2026!',
      clienteId: 'ajeno',
    }).success,
    false,
  )
})
