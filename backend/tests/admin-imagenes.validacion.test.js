import test from 'node:test'
import assert from 'node:assert/strict'
import { validarImagenesProductoAdmin } from '../src/modules/admin/admin-imagenes.validacion.js'

test('acepta hasta cinco imágenes únicas y con texto alternativo', () => {
  const resultado = validarImagenesProductoAdmin({
    imagenes: [
      { url: 'https://cdn.ejemplo.test/aceite-frontal.webp', storageKey: 'sumarket/productos/aceite-frontal', textoAlternativo: 'Botella de aceite frontal' },
      { url: 'https://cdn.ejemplo.test/aceite-lateral.webp', textoAlternativo: 'Botella de aceite lateral' },
    ],
  })

  assert.equal(resultado.success, true)
})

test('rechaza galerías sin imagen principal o con URLs repetidas', () => {
  const sinImagenes = validarImagenesProductoAdmin({ imagenes: [] })
  const repetidas = validarImagenesProductoAdmin({
    imagenes: [
      { url: 'https://cdn.ejemplo.test/aceite.webp', textoAlternativo: 'Aceite' },
      { url: 'https://cdn.ejemplo.test/aceite.webp', textoAlternativo: 'Aceite repetido' },
    ],
  })

  assert.equal(sinImagenes.success, false)
  assert.equal(repetidas.success, false)
})
