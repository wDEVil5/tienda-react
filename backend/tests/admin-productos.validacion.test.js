import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validarCambiosProductoAdmin,
  validarProductoNuevoAdmin,
} from '../src/modules/admin/admin-productos.validacion.js'

const categoriaId = '550e8400-e29b-41d4-a716-446655440000'
const marcaId = '550e8400-e29b-41d4-a716-446655440001'
const etiquetaId = '550e8400-e29b-41d4-a716-446655440002'

test('acepta cambios válidos enviados por el editor de producto', () => {
  const resultado = validarCambiosProductoAdmin({
    nombre: 'Aceite de oliva extra virgen 500 ml',
    sku: 'ACE-OLIVA-500',
    slug: 'aceite-oliva-extra-virgen-500-ml',
    precio: 7990,
    precioAnterior: 9990,
    stock: 12,
    categoriaId,
    marcaId,
    fechaVencimiento: '2027-01-31',
    etiquetaIds: [etiquetaId],
  })

  assert.equal(resultado.success, true)
})

test('rechaza valores inválidos o campos que no pertenecen al contrato', () => {
  const resultado = validarCambiosProductoAdmin({
    stock: -1,
    campoInventado: true,
  })

  assert.equal(resultado.success, false)
  assert.ok(resultado.error.issues.length >= 2)
})

test('rechaza un precio anterior menor o igual al precio actual', () => {
  const resultado = validarCambiosProductoAdmin({ precio: 7990, precioAnterior: 7990 })

  assert.equal(resultado.success, false)
  assert.equal(resultado.error.issues[0].path[0], 'precioAnterior')
})

test('rechaza una actualización sin cambios', () => {
  const resultado = validarCambiosProductoAdmin({})

  assert.equal(resultado.success, false)
})

test('exige los campos base al crear un producto', () => {
  const resultado = validarProductoNuevoAdmin({
    nombre: 'Té verde',
    sku: 'TE-VERDE-250',
    descripcion: 'Té de hoja.',
    precio: 3490,
    stock: 10,
    categoriaId,
    marcaId,
  })

  assert.equal(resultado.success, true)
})
