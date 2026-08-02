import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validarContrasenaUsuarioAdmin,
  validarUsuarioNuevoAdmin,
} from '../src/modules/admin/admin-usuarios.validacion.js'

test('valida un operador nuevo y normaliza su correo', () => {
  const resultado = validarUsuarioNuevoAdmin({
    nombre: 'Operador Uno', email: ' OPERADOR@EJEMPLO.TEST ', contrasena: 'Una frase segura 2026',
  })

  assert.equal(resultado.success, true)
  assert.equal(resultado.data.email, 'operador@ejemplo.test')
})

test('rechaza una contraseña de operador demasiado corta', () => {
  const resultado = validarUsuarioNuevoAdmin({
    nombre: 'Operador Uno', email: 'operador@ejemplo.test', contrasena: 'corta-123',
  })

  assert.equal(resultado.success, false)
})

test('valida el contrato reducido para restablecer una contraseña', () => {
  assert.equal(validarContrasenaUsuarioAdmin({ contrasena: 'Una frase segura 2026' }).success, true)
  assert.equal(validarContrasenaUsuarioAdmin({ contrasena: 'corta-123' }).success, false)
})
