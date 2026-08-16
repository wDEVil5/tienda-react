import test from 'node:test'
import assert from 'node:assert/strict'
import { iniciarBarridoExpiracion } from '../src/modules/pedidos/pedidos.barrido.js'

const loggerMudo = { log() {}, error() {} }
const esperarMicrotareas = () => new Promise((resolve) => setImmediate(resolve))

test('iniciarBarridoExpiracion corre un barrido al arrancar', async () => {
  let llamadas = 0
  const barrido = iniciarBarridoExpiracion({
    cadaMinutos: 60,
    logger: loggerMudo,
    ejecutar: async () => {
      llamadas += 1
      return { revisados: 0, expirados: 0 }
    },
  })

  await esperarMicrotareas()
  barrido.detener()

  assert.equal(llamadas, 1)
})

test('iniciarBarridoExpiracion no voltea el proceso si el barrido falla', async () => {
  let registrado = ''
  const barrido = iniciarBarridoExpiracion({
    cadaMinutos: 60,
    logger: { log() {}, error: (mensaje) => { registrado = mensaje } },
    ejecutar: async () => {
      throw new Error('BD caída')
    },
  })

  await esperarMicrotareas()
  barrido.detener()

  assert.match(registrado, /BD caída/)
})

test('iniciarBarridoExpiracion registra solo cuando expiró algún pedido', async () => {
  const lineas = []
  const barrido = iniciarBarridoExpiracion({
    cadaMinutos: 60,
    logger: { log: (m) => lineas.push(m), error() {} },
    ejecutar: async () => ({ revisados: 3, expirados: 2 }),
  })

  await esperarMicrotareas()
  barrido.detener()

  assert.equal(lineas.length, 1)
  assert.match(lineas[0], /expirados: 2/)
})
