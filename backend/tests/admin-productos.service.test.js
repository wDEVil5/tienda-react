import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioProductosAdmin } from '../src/modules/admin/admin-productos.service.js'

test('obtenerProductoParaEdicion expone los datos que necesita el editor', async () => {
  const repositorio = {
    async obtenerPorId() {
      return {
        id: 'producto-1',
        sku: 'ACE-001',
        slug: 'aceite-oliva',
        nombre: 'Aceite de oliva',
        descripcion: 'Descripción',
        precio: 7990,
        precioAnterior: 9990,
        stock: 12,
        activo: true,
        destacado: true,
        alertaStockBajo: 3,
        codigoBarras: '1234567890',
        origen: 'Colchagua',
        contenidoCantidad: 500,
        contenidoUnidad: 'ml',
        pesoDespachoGramos: 700,
        fechaVencimiento: new Date('2027-01-31T00:00:00.000Z'),
        categoria: { id: 'cat-1', nombre: 'Despensa', slug: 'despensa' },
        marca: { id: 'marca-1', nombre: 'Valle Oliva', slug: 'valle-oliva', logoUrl: null },
        imagenes: [{ id: 'imagen-1', url: 'https://ejemplo.test/aceite.jpg', textoAlternativo: 'Aceite', orden: 1 }],
        etiquetas: [{ etiqueta: { id: 'etiqueta-1', nombre: 'Vegano', slug: 'vegano' } }],
      }
    },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const producto = await servicio.obtenerProductoParaEdicion('producto-1')

  assert.equal(producto.activo, true)
  assert.equal(producto.destacado, true)
  assert.equal(producto.contenidoCantidad, 500)
  assert.equal(producto.marca.nombre, 'Valle Oliva')
  assert.deepEqual(producto.etiquetas, [
    { id: 'etiqueta-1', nombre: 'Vegano', slug: 'vegano' },
  ])
})
