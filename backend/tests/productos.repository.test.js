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
    // Taxonomía para la resolución colapsada del término de búsqueda.
    marca: {
      async findMany() {
        return [{ slug: 'cafe-instantaneo', nombre: 'Café Instantáneo' }]
      },
    },
    categoria: {
      async findMany() {
        return [{ slug: 'despensa', nombre: 'Despensa' }]
      },
    },
    subcategoria: {
      async findMany() {
        return []
      },
    },
    subcategoriaHija: {
      async findMany() {
        return []
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
    estado: 'PUBLICADO',
    OR: [
      { nombreBusqueda: { contains: 'cafe', mode: 'insensitive' } },
      // "cafe" colapsado calza la marca "Café Instantáneo" (slug cafe-instantaneo);
      // la categoría "Despensa" no calza, así que no se agrega.
      { marca: { slug: { in: ['cafe-instantaneo'] } } },
    ],
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
  assert.equal('estado' in productos[0], false)

  const fechaConsulta = new Date('2026-08-01T12:00:00.000Z')
  const maxDescuento = await repositorio.obtenerMaximoDescuentoVigente(fechaConsulta)

  assert.equal(maxDescuento, 25)
  assert.deepEqual(consultaResumen, {
    where: {
      activa: true,
      empiezaEn: { lte: fechaConsulta },
      terminaEn: { gt: fechaConsulta },
      productos: { some: { producto: { estado: 'PUBLICADO' } } },
    },
    _max: { porcentajeDescuento: true },
  })
})

test('la búsqueda es tolerante a la separación: "camposur" calza la marca "Campo Sur"', async () => {
  let consulta
  const cliente = {
    producto: {
      async findMany(argumentos) { consulta = argumentos; return [] },
    },
    marca: {
      async findMany() {
        return [
          { slug: 'campo-sur', nombre: 'Campo Sur' },
          { slug: 'valle-oliva', nombre: 'Valle Oliva' },
        ]
      },
    },
    categoria: { async findMany() { return [] } },
    subcategoria: { async findMany() { return [] } },
    subcategoriaHija: { async findMany() { return [] } },
  }

  const repositorio = crearRepositorioProductos(cliente)
  await repositorio.listarPublicados({ query: 'camposur' })

  assert.deepEqual(consulta.where.OR, [
    { nombreBusqueda: { contains: 'camposur', mode: 'insensitive' } },
    { marca: { slug: { in: ['campo-sur'] } } },
  ])
})

test('el filtro por subcategoría acota la consulta por slug', async () => {
  let consulta
  const cliente = {
    producto: {
      async findMany(argumentos) {
        consulta = argumentos
        return []
      },
      async count() {
        return 0
      },
    },
  }

  const repositorio = crearRepositorioProductos(cliente)
  await repositorio.listarPublicados({
    ahora: new Date('2026-08-01T12:00:00.000Z'),
    subcategoria: 'despensa-cafe-y-cafeteras',
    page: 1,
    limit: 20,
    orden: 'relevancia',
  })

  assert.deepEqual(consulta.where.subcategoria, { slug: 'despensa-cafe-y-cafeteras' })
})

test('el filtro del tercer nivel acota la consulta por la hija exacta', async () => {
  let consulta
  const cliente = {
    producto: {
      async findMany(argumentos) { consulta = argumentos; return [] },
      async count() { return 0 },
    },
  }

  const repositorio = crearRepositorioProductos(cliente)
  await repositorio.listarPublicados({
    ahora: new Date('2026-08-01T12:00:00.000Z'),
    subcategoriaHija: 'despensa-cafe-y-cafeteras-cafe-en-grano',
    page: 1,
    limit: 20,
    orden: 'relevancia',
  })

  assert.deepEqual(consulta.where.subcategoriaHija, {
    slug: 'despensa-cafe-y-cafeteras-cafe-en-grano',
  })
})

test('el filtro disponible compara stock con unidades reservadas en la base', async () => {
  let consulta
  const campos = { stockReservado: { _ref: 'stockReservado' } }
  const cliente = {
    producto: {
      fields: campos,
      async findMany(argumentos) { consulta = argumentos; return [] },
      async count() { return 0 },
    },
  }

  const repositorio = crearRepositorioProductos(cliente)
  await repositorio.listarPublicados({
    ahora: new Date('2026-08-01T12:00:00.000Z'),
    soloDisponibles: true,
    page: 1,
    limit: 20,
    orden: 'relevancia',
  })

  assert.deepEqual(consulta.where.stock, { gt: campos.stockReservado })
})

test('el filtro por marca(s) acota por slug con IN', async () => {
  let consulta
  const cliente = {
    producto: {
      async findMany(argumentos) {
        consulta = argumentos
        return []
      },
      async count() {
        return 0
      },
    },
  }

  const repositorio = crearRepositorioProductos(cliente)
  await repositorio.listarPublicados({
    ahora: new Date('2026-08-01T12:00:00.000Z'),
    marca: ['kraft', 'nestle'],
    page: 1,
    limit: 20,
    orden: 'relevancia',
  })

  assert.deepEqual(consulta.where.marca, { slug: { in: ['kraft', 'nestle'] } })
})

test('los filtros por atributos exigen cada combinación atributo y opción', async () => {
  let consulta
  const cliente = {
    producto: {
      async findMany(argumentos) { consulta = argumentos; return [] },
      async count() { return 0 },
    },
  }

  const repositorio = crearRepositorioProductos(cliente)
  await repositorio.listarPublicados({
    ahora: new Date('2026-08-01T12:00:00.000Z'),
    atributos: [
      { atributo: 'intensidad', opcion: 'alta' },
      { atributo: 'formato', opcion: 'molido' },
    ],
    page: 1,
    limit: 20,
    orden: 'relevancia',
  })

  assert.deepEqual(consulta.where.AND, [
    { atributos: { some: { atributo: { slug: 'intensidad' }, opcion: { slug: 'alta' } } } },
    { atributos: { some: { atributo: { slug: 'formato' }, opcion: { slug: 'molido' } } } },
  ])
})
