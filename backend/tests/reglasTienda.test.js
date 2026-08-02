import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REGLAS_POR_DEFECTO,
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
      subtotal: REGLAS_POR_DEFECTO.envioGratisDesde,
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
  assert.equal(tarifa, REGLAS_POR_DEFECTO.tarifaBase)
  assert.equal(plazoHoras, null)
})

test('una modalidad desconocida falla en vez de asumir gratis', () => {
  assert.throws(
    () => calcularCostoEnvio({ modalidad: 'DRON', subtotal: 1000 }),
    /Modalidad de entrega desconocida/,
  )
})

test('el cálculo honra las reglas que se le pasan, no solo los defaults', () => {
  const reglas = {
    envioGratisDesde: 50000,
    tarifaBase: 5000,
    tarifasComuna: [{ comuna: 'nunoa', nombre: 'Ñuñoa', tarifa: 1500, plazoHoras: 12 }],
  }

  // Con umbral 50.000, un subtotal de 20.000 ya no es envío gratis: cobra la
  // tarifa de la comuna definida en ESAS reglas (no en los defaults).
  assert.equal(
    calcularCostoEnvio({ modalidad: 'DESPACHO', comuna: 'Ñuñoa', subtotal: 20000 }, reglas),
    1500,
  )
  // Una comuna fuera de esa tabla usa la tarifa base de esas reglas.
  assert.equal(tarifaDespachoPorComuna('Maipú', reglas).tarifa, 5000)
})
