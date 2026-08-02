import test from 'node:test'
import assert from 'node:assert/strict'
import { validarMarcaNuevaAdmin } from '../src/modules/admin/admin-marcas.validacion.js'

test('validarMarcaNuevaAdmin rechaza URLs de logo manuales', () => {
  assert.equal(validarMarcaNuevaAdmin({ nombre: 'Marca', logoUrl: 'https://ejemplo.test/logo.png' }).success, false)
})
