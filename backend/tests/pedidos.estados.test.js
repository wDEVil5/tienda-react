import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ESTADO_INICIAL,
  esEstadoTerminal,
  esTransicionValida,
  transicionesValidas,
} from '../src/modules/pedidos/pedidos.estados.js'

test('el pedido nace en PENDIENTE', () => {
  assert.equal(ESTADO_INICIAL, 'PENDIENTE')
})

test('el flujo de retiro avanza por LISTO_PARA_RETIRO, no por ENVIADO', () => {
  assert.ok(
    esTransicionValida({ desde: 'PREPARANDO', hacia: 'LISTO_PARA_RETIRO', modalidad: 'RETIRO' }),
  )
  assert.ok(
    !esTransicionValida({ desde: 'PREPARANDO', hacia: 'ENVIADO', modalidad: 'RETIRO' }),
  )
})

test('el flujo de despacho avanza por ENVIADO, no por LISTO_PARA_RETIRO', () => {
  assert.ok(
    esTransicionValida({ desde: 'PREPARANDO', hacia: 'ENVIADO', modalidad: 'DESPACHO' }),
  )
  assert.ok(
    !esTransicionValida({ desde: 'PREPARANDO', hacia: 'LISTO_PARA_RETIRO', modalidad: 'DESPACHO' }),
  )
})

test('se puede cancelar desde cualquier estado no terminal', () => {
  for (const estado of ['PENDIENTE', 'PREPARANDO', 'ENVIADO']) {
    assert.ok(
      esTransicionValida({ desde: estado, hacia: 'CANCELADO', modalidad: 'DESPACHO' }),
    )
  }
})

test('un estado terminal no admite salidas', () => {
  assert.ok(esEstadoTerminal('ENTREGADO'))
  assert.ok(esEstadoTerminal('CANCELADO'))
  assert.deepEqual(transicionesValidas('ENTREGADO', 'RETIRO'), [])
  assert.ok(
    !esTransicionValida({ desde: 'CANCELADO', hacia: 'PENDIENTE', modalidad: 'RETIRO' }),
  )
})

test('no se puede saltar estados intermedios', () => {
  assert.ok(
    !esTransicionValida({ desde: 'PENDIENTE', hacia: 'ENTREGADO', modalidad: 'RETIRO' }),
  )
})
