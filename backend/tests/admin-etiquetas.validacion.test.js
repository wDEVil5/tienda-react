import test from 'node:test'
import assert from 'node:assert/strict'
import { validarEtiquetaNuevaAdmin } from '../src/modules/admin/admin-etiquetas.validacion.js'

test('validarEtiquetaNuevaAdmin rechaza campos desconocidos', () => {
  assert.equal(validarEtiquetaNuevaAdmin({ nombre: 'Vegano', destacada: true }).success, false)
})
