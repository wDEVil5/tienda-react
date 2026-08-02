import test from 'node:test'
import assert from 'node:assert/strict'
import { validarReglas } from '../src/modules/reglas/reglas.validacion.js'

const base = {
  envioGratisDesde: 20000,
  tarifaBase: 2990,
  corteRetiroHoy: '19:00',
  preparacionHoras: 2,
  tarifasComuna: [{ nombre: 'Providencia', tarifa: 2990, plazoHoras: 24 }],
}

test('acepta reglas bien formadas', () => {
  assert.equal(validarReglas(base).success, true)
})

test('rechaza una hora de corte con formato inválido', () => {
  assert.equal(validarReglas({ ...base, corteRetiroHoy: '25:00' }).success, false)
})

test('rechaza montos negativos', () => {
  assert.equal(validarReglas({ ...base, tarifaBase: -100 }).success, false)
})

test('rechaza comunas repetidas aunque cambien tildes o mayúsculas', () => {
  const datos = {
    ...base,
    tarifasComuna: [
      { nombre: 'Ñuñoa', tarifa: 2990 },
      { nombre: 'nunoa', tarifa: 3990 },
    ],
  }
  assert.equal(validarReglas(datos).success, false)
})

test('rechaza campos desconocidos (contrato estricto)', () => {
  assert.equal(validarReglas({ ...base, total: 9999 }).success, false)
})
