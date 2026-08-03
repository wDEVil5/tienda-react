import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ESTADO_STOCK,
  calcularDisponible,
  calcularEstadoStock,
} from '../src/lib/estadoStock.js'

test('calcularDisponible resta las unidades reservadas', () => {
  assert.equal(calcularDisponible({ stock: 10, stockReservado: 3 }), 7)
})

test('calcularDisponible nunca es negativo aunque lo reservado supere el stock', () => {
  assert.equal(calcularDisponible({ stock: 2, stockReservado: 5 }), 0)
})

test('calcularDisponible asume cero cuando faltan datos', () => {
  assert.equal(calcularDisponible(), 0)
})

test('estadoStock es AGOTADO cuando no hay disponible', () => {
  assert.equal(
    calcularEstadoStock({ stock: 4, stockReservado: 4, alertaStockBajo: 3 }),
    ESTADO_STOCK.AGOTADO,
  )
})

test('estadoStock es ULTIMAS_UNIDADES al tocar el umbral', () => {
  assert.equal(
    calcularEstadoStock({ stock: 3, stockReservado: 0, alertaStockBajo: 3 }),
    ESTADO_STOCK.ULTIMAS_UNIDADES,
  )
})

test('estadoStock es DISPONIBLE por encima del umbral', () => {
  assert.equal(
    calcularEstadoStock({ stock: 10, stockReservado: 0, alertaStockBajo: 3 }),
    ESTADO_STOCK.DISPONIBLE,
  )
})

test('sin umbral no existe el estado intermedio: solo disponible o agotado', () => {
  assert.equal(
    calcularEstadoStock({ stock: 1, stockReservado: 0, alertaStockBajo: null }),
    ESTADO_STOCK.DISPONIBLE,
  )
  assert.equal(
    calcularEstadoStock({ stock: 0, stockReservado: 0, alertaStockBajo: null }),
    ESTADO_STOCK.AGOTADO,
  )
})
