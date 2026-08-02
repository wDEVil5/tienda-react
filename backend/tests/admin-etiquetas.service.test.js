import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioEtiquetasAdmin } from '../src/modules/admin/admin-etiquetas.service.js'

test('crearEtiqueta genera un slug consistente', async () => {
  let datosCreacion
  const servicio = crearServicioEtiquetasAdmin({
    async crear(datos) { datosCreacion = datos; return { id: 'etiqueta-1', ...datos } },
  })

  const etiqueta = await servicio.crearEtiqueta({ nombre: 'Sin azúcar' })

  assert.equal(datosCreacion.slug, 'sin-azucar')
  assert.equal(etiqueta.nombre, 'Sin azúcar')
})
