import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ENVIO_GRATIS_DESDE,
  TARIFA_BASE,
  calcularCostoEnvio,
  tarifaDespachoPorComuna,
} from '../src/lib/reglasTienda.js'

test('el retiro en tienda nunca tiene costo de envío', () => {
  assert.equal(calcularCostoEnvio({ modalidad: 'RETIRO', subtotal: 1000 }), 0)
})

test('el despacho es gratis al alcanzar el umbral', () => {
  assert.equal(
    calcularCostoEnvio({
      modalidad: 'DESPACHO',
      comuna: 'Maipú',
      subtotal: ENVIO_GRATIS_DESDE,
    }),
    0,
  )
})

test('el despacho bajo el umbral cobra la tarifa de la comuna', () => {
  assert.equal(
    calcularCostoEnvio({
      modalidad: 'DESPACHO',
      comuna: 'Las Condes',
      subtotal: 5000,
    }),
    3990,
  )
})

test('la comuna se reconoce sin importar tildes ni mayúsculas', () => {
  assert.equal(tarifaDespachoPorComuna('ÑUÑOA').tarifa, 2990)
  assert.equal(tarifaDespachoPorComuna('Providencia').tarifa, 2990)
})

test('una comuna fuera de la tabla usa la tarifa base', () => {
  const { tarifa, plazoHoras } = tarifaDespachoPorComuna('Puente Alto')
  assert.equal(tarifa, TARIFA_BASE)
  assert.equal(plazoHoras, null)
})

test('una modalidad desconocida falla en vez de asumir gratis', () => {
  assert.throws(
    () => calcularCostoEnvio({ modalidad: 'DRON', subtotal: 1000 }),
    /Modalidad de entrega desconocida/,
  )
})
