import test from 'node:test'
import assert from 'node:assert/strict'
import { crearRepositorioProductos } from '../src/modules/productos/productos.repository.js'

test('el repositorio consulta solo productos publicados y adapta sus imágenes', async () => {
  let consulta
  const cliente = {
    producto: {
      async findMany(argumentos) {
        consulta = argumentos
        return [
          {
            id: 'producto-1',
            sku: 'SKU-1',
            slug: 'producto-uno',
            nombre: 'Producto uno',
            descripcion: 'Descripción',
            precio: 1000,
            precioAnterior: null,
            stock: 3,
            categoria: { id: 'categoria-1', nombre: 'Despensa', slug: 'despensa' },
            marca: { id: 'marca-1', nombre: 'Marca Uno', slug: 'marca-uno', logoUrl: null },
            imagenes: [
              {
                url: 'https://ejemplo.test/producto.jpg',
                textoAlternativo: 'Producto uno',
                orden: 1,
              },
            ],
          },
        ]
      },
    },
  }

  const repositorio = crearRepositorioProductos(cliente)
  const productos = await repositorio.listarPublicados()

  assert.deepEqual(consulta.where, { activo: true })
  assert.equal(consulta.orderBy.createdAt, 'asc')
  assert.deepEqual(productos[0].imagenes, [
    { url: 'https://ejemplo.test/producto.jpg', alt: 'Producto uno', orden: 1 },
  ])
  assert.equal('activo' in productos[0], false)
})
