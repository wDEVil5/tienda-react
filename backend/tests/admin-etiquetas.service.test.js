import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioEtiquetasAdmin } from '../src/modules/admin/admin-etiquetas.service.js'

test('listarEtiquetas incluye el uso de cada etiqueta', async () => {
  const servicio = crearServicioEtiquetasAdmin({
    async listar() {
      return [{ id: 'etiqueta-1', nombre: 'Vegano', slug: 'vegano', _count: { productos: 2 } }]
    },
  })

  const resultado = await servicio.listarEtiquetas()

  assert.deepEqual(resultado.data, [
    { id: 'etiqueta-1', nombre: 'Vegano', slug: 'vegano', productosAsignados: 2 },
  ])
})

test('crearEtiqueta genera un slug consistente', async () => {
  let datosCreacion
  const servicio = crearServicioEtiquetasAdmin({
    async crear(datos) { datosCreacion = datos; return { id: 'etiqueta-1', ...datos } },
  })

  const etiqueta = await servicio.crearEtiqueta({ nombre: 'Sin azúcar' })

  assert.equal(datosCreacion.slug, 'sin-azucar')
  assert.equal(etiqueta.nombre, 'Sin azúcar')
})
