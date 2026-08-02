import test from 'node:test'
import assert from 'node:assert/strict'
import { crearRepositorioProductos } from '../src/modules/productos/productos.repository.js'

test('el repositorio consulta solo productos publicados y adapta sus imágenes', async () => {
  let consulta
  let consultaResumen
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
            origen: 'Valle de prueba',
            contenidoCantidad: 500,
            contenidoUnidad: 'ml',
            pesoDespachoGramos: 700,
            codigoBarras: null,
            fechaVencimiento: null,
            categoria: { id: 'categoria-1', nombre: 'Despensa', slug: 'despensa' },
            marca: { id: 'marca-1', nombre: 'Marca Uno', slug: 'marca-uno', logoUrl: null },
            etiquetas: [],
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
      async count() {
        return 1
      },
    },
    promocion: {
      async aggregate(argumentos) {
        consultaResumen = argumentos
        return { _max: { porcentajeDescuento: 25 } }
      },
    },
  }

  const repositorio = crearRepositorioProductos(cliente)
  const productos = await repositorio.listarPublicados({
    ahora: new Date('2026-08-01T12:00:00.000Z'),
    query: 'cafe',
    categoria: 'despensa',
    soloOfertas: true,
    precioMin: 500,
    precioMax: 2000,
    page: 2,
    limit: 10,
    orden: 'precio-desc',
  })

  assert.deepEqual(consulta.where, {
    activo: true,
    nombreBusqueda: { contains: 'cafe', mode: 'insensitive' },
    categoria: { slug: 'despensa' },
    promociones: {
      some: {
        promocion: {
          activa: true,
          empiezaEn: { lte: new Date('2026-08-01T12:00:00.000Z') },
          terminaEn: { gt: new Date('2026-08-01T12:00:00.000Z') },
        },
      },
    },
    precio: { gte: 500, lte: 2000 },
  })
  assert.deepEqual(consulta.orderBy, [{ precio: 'desc' }, { id: 'asc' }])
  assert.equal(consulta.skip, 10)
  assert.equal(consulta.take, 10)
  assert.equal(productos[0].oferta, null)
  assert.equal(productos[0].fechaVencimiento, null)
  assert.deepEqual(productos[0].precioPorUnidad, { monto: 2000, unidad: 'L' })
  assert.deepEqual(productos[0].etiquetas, [])
  assert.deepEqual(productos[0].imagenes, [
    { url: 'https://ejemplo.test/producto.jpg', alt: 'Producto uno', orden: 1 },
  ])
  assert.equal('activo' in productos[0], false)

  const fechaConsulta = new Date('2026-08-01T12:00:00.000Z')
  const maxDescuento = await repositorio.obtenerMaximoDescuentoVigente(fechaConsulta)

  assert.equal(maxDescuento, 25)
  assert.deepEqual(consultaResumen, {
    where: {
      activa: true,
      empiezaEn: { lte: fechaConsulta },
      terminaEn: { gt: fechaConsulta },
      productos: { some: { producto: { activo: true } } },
    },
    _max: { porcentajeDescuento: true },
  })
})
