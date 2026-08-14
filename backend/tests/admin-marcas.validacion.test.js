import test from 'node:test'
import assert from 'node:assert/strict'
import { validarMarcaNuevaAdmin } from '../src/modules/admin/admin-marcas.validacion.js'

test('validarMarcaNuevaAdmin rechaza URLs de logo manuales', () => {
  assert.equal(validarMarcaNuevaAdmin({ nombre: 'Marca', logoUrl: 'https://ejemplo.test/logo.png' }).success, false)
})

test('validarMarcaNuevaAdmin acepta el dominio oficial de Brandfetch', () => {
  assert.equal(validarMarcaNuevaAdmin({ nombre: 'Marca', brandfetchDomain: 'marca.cl' }).success, true)
  assert.equal(validarMarcaNuevaAdmin({ nombre: 'Marca', brandfetchDomain: 'https://marca.cl' }).success, false)
})
