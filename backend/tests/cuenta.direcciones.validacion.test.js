import test from 'node:test'
import assert from 'node:assert/strict'
import { validarDireccionCliente } from '../src/modules/cuenta/cuenta.direcciones.validacion.js'

const base = { calle: 'Av. Providencia 1234', comuna: 'Providencia', region: 'RM' }

test('acepta una dirección válida (opcionales ausentes)', () => {
  assert.equal(validarDireccionCliente(base).success, true)
})

test('acepta etiqueta, depto, instrucciones y predeterminada', () => {
  const datos = { ...base, etiqueta: 'Casa', depto: '502', instrucciones: 'Conserjería', predeterminada: true }
  assert.equal(validarDireccionCliente(datos).success, true)
})

test('rechaza una calle demasiado corta', () => {
  assert.equal(validarDireccionCliente({ ...base, calle: 'Av' }).success, false)
})

test('rechaza si falta la comuna', () => {
  const { comuna, ...sinComuna } = base
  assert.equal(validarDireccionCliente(sinComuna).success, false)
})

test('rechaza un clienteId inyectado en el cuerpo (strict)', () => {
  assert.equal(validarDireccionCliente({ ...base, clienteId: 'otro' }).success, false)
})
