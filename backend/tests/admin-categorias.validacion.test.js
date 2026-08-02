import test from 'node:test'
import assert from 'node:assert/strict'
import { validarCategoriaNuevaAdmin } from '../src/modules/admin/admin-categorias.validacion.js'

test('validarCategoriaNuevaAdmin rechaza datos fuera del contrato', () => {
  assert.equal(validarCategoriaNuevaAdmin({ nombre: 'OK', activa: false }).success, false)
})
