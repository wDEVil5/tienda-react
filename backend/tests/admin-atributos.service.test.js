import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ErrorAtributoAdmin,
  crearServicioAtributosAdmin,
} from '../src/modules/admin/admin-atributos.service.js'

const categoria = { id: 'categoria-1', slug: 'despensa' }

function atributo(overrides = {}) {
  return {
    id: 'atributo-1',
    categoriaId: categoria.id,
    nombre: 'Intensidad',
    slug: 'despensa-intensidad',
    tipo: 'SELECCION',
    orden: 0,
    activo: true,
    _count: { valores: 0 },
    opciones: [],
    ...overrides,
  }
}

test('crea un atributo con slug contextual de la categoría', async () => {
  let creado
  const servicio = crearServicioAtributosAdmin({
    categoria: async () => categoria,
    crearAtributo: async (datos) => {
      creado = datos
      return atributo({ ...datos, _count: { valores: 0 }, opciones: [] })
    },
  })

  const resultado = await servicio.crear(categoria.id, { nombre: 'Intensidad', orden: 2 })

  assert.equal(creado.slug, 'despensa-intensidad')
  assert.equal(resultado.nombre, 'Intensidad')
  assert.equal(resultado.productosAsignados, 0)
})

test('no elimina un atributo mientras tenga opciones o productos asignados', async () => {
  const servicio = crearServicioAtributosAdmin({
    atributo: async () => atributo({ opciones: [{ id: 'opcion-1' }] }),
  })

  await assert.rejects(
    () => servicio.eliminar('atributo-1'),
    (error) => error instanceof ErrorAtributoAdmin && error.code === 'ATTRIBUTE_IN_USE',
  )
})

test('no elimina una opción que ya fue asignada a productos', async () => {
  const servicio = crearServicioAtributosAdmin({
    opcion: async () => ({
      id: 'opcion-1',
      atributoId: 'atributo-1',
      _count: { valores: 1 },
    }),
  })

  await assert.rejects(
    () => servicio.eliminarOpcion('opcion-1'),
    (error) => error instanceof ErrorAtributoAdmin && error.code === 'ATTRIBUTE_OPTION_IN_USE',
  )
})
