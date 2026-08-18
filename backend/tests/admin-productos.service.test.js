import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioProductosAdmin } from '../src/modules/admin/admin-productos.service.js'

test('listarProductos entrega un resumen paginado que incluye borradores', async () => {
  let filtrosRecibidos
  const repositorio = {
    async listar(filtros) {
      filtrosRecibidos = filtros
      return [{
        id: 'producto-1', sku: 'ACE-001', slug: 'aceite', nombre: 'Aceite', precio: 7990,
        stock: 0, estado: 'BORRADOR', destacado: false,
        categoria: { id: 'cat-1', nombre: 'Despensa', slug: 'despensa' },
        marca: { id: 'marca-1', nombre: 'Marca' },
        imagenes: [{ url: 'https://ejemplo.test/aceite.webp', textoAlternativo: 'Aceite' }],
      }]
    },
    async contar() { return 1 },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const resultado = await servicio.listarProductos({ page: 1, limit: 20 })

  assert.deepEqual(resultado.meta, { page: 1, limit: 20, total: 1, totalPages: 1 })
  assert.equal(resultado.data[0].estado, 'BORRADOR')
  assert.deepEqual(resultado.data[0].imagen, {
    url: 'https://ejemplo.test/aceite.webp', alt: 'Aceite',
  })
  assert.deepEqual(filtrosRecibidos, { page: 1, limit: 20 })
})

test('listarProductos normaliza la búsqueda y filtra por estado editorial', async () => {
  let filtrosRecibidos
  const servicio = crearServicioProductosAdmin({
    async listar(filtros) { filtrosRecibidos = filtros; return [] },
    async contar() { return 0 },
  })

  await servicio.listarProductos({ query: '  CAFÉ  ', estado: 'BORRADOR' })

  assert.deepEqual(filtrosRecibidos, {
    page: 1, limit: 20, query: 'cafe', estado: 'BORRADOR',
  })
})

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
        estado: 'PUBLICADO',
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
        imagenes: [{ id: 'imagen-1', url: 'https://ejemplo.test/aceite.jpg', storageKey: 'sumarket/productos/aceite', textoAlternativo: 'Aceite', orden: 1 }],
        etiquetas: [{ etiqueta: { id: 'etiqueta-1', nombre: 'Vegano', slug: 'vegano' } }],
      }
    },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const producto = await servicio.obtenerProductoParaEdicion('producto-1')

  assert.equal(producto.estado, 'PUBLICADO')
  assert.equal(producto.destacado, true)
  assert.equal(producto.contenidoCantidad, 500)
  assert.equal(producto.marca.nombre, 'Valle Oliva')
  assert.equal(producto.imagenes[0].storageKey, 'sumarket/productos/aceite')
  assert.deepEqual(producto.etiquetas, [
    { id: 'etiqueta-1', nombre: 'Vegano', slug: 'vegano' },
  ])
})

test('actualizarProducto deriva la clave de búsqueda al cambiar el nombre', async () => {
  let datosActualizacion
  const producto = {
    id: 'producto-1',
    sku: 'ACE-001', slug: 'aceite-oliva', nombre: 'Aceite', descripcion: 'Descripción',
    precio: 7990, precioAnterior: 9990, stock: 12, estado: 'PUBLICADO', destacado: false,
    alertaStockBajo: null, codigoBarras: null, origen: null, contenidoCantidad: null,
    contenidoUnidad: null, pesoDespachoGramos: null, fechaVencimiento: null,
    categoria: { id: 'cat-1', nombre: 'Despensa', slug: 'despensa' },
    marca: { id: 'marca-1', nombre: 'Marca', slug: 'marca', logoUrl: null },
    imagenes: [], etiquetas: [],
  }
  const repositorio = {
    async obtenerPorId() { return producto },
    async actualizarPorId(_id, datos) {
      datosActualizacion = datos
      return { ...producto, ...datos }
    },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const actualizado = await servicio.actualizarProducto('producto-1', {
    nombre: 'Café de grano',
  })

  assert.equal(datosActualizacion.nombreBusqueda, 'cafe de grano')
  assert.equal(actualizado.nombre, 'Café de grano')
})

test('actualizarProducto conecta la subcategoría hija cuando pertenece a la subcategoría', async () => {
  let datosActualizacion
  const producto = {
    id: 'producto-1', sku: 'LE-001', slug: 'leche-entera', nombre: 'Leche entera 1 L', descripcion: 'x',
    precio: 1200, precioAnterior: null, stock: 10, estado: 'PUBLICADO', destacado: false,
    alertaStockBajo: null, codigoBarras: null, origen: null, contenidoCantidad: null,
    contenidoUnidad: null, pesoDespachoGramos: null, fechaVencimiento: null,
    categoriaId: 'cat-1', subcategoriaId: 'sub-leche',
    categoria: { id: 'cat-1', nombre: 'Lácteos', slug: 'lacteos' },
    marca: null, imagenes: [], etiquetas: [],
  }
  const repositorio = {
    async obtenerPorId() { return producto },
    async obtenerSubcategoriaHija(id) {
      return id === 'hija-entera' ? { id: 'hija-entera', subcategoriaId: 'sub-leche' } : null
    },
    async actualizarPorId(_id, datos) { datosActualizacion = datos; return { ...producto, ...datos } },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  await servicio.actualizarProducto('producto-1', { subcategoriaHijaId: 'hija-entera' })

  assert.deepEqual(datosActualizacion.subcategoriaHija, { connect: { id: 'hija-entera' } })
})

test('actualizarProducto rechaza una hija que pertenece a otra subcategoría', async () => {
  const producto = {
    id: 'producto-1', categoriaId: 'cat-1', subcategoriaId: 'sub-leche',
    estado: 'BORRADOR', precio: 1200, precioAnterior: null, imagenes: [{ id: 'img' }],
  }
  const repositorio = {
    async obtenerPorId() { return producto },
    async obtenerSubcategoriaHija() { return { id: 'hija-otra', subcategoriaId: 'sub-yogur' } },
    async actualizarPorId() { throw new Error('no debería actualizar') },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  await assert.rejects(
    servicio.actualizarProducto('producto-1', { subcategoriaHijaId: 'hija-otra' }),
    /INVALID_PRODUCT_REFERENCE|válid/i,
  )
})

test('reemplazarImagenesProducto delega una galería completa al repositorio', async () => {
  let imagenesRecibidas
  const clavesEliminadas = []
  const producto = {
    id: 'producto-1', sku: 'ACE-001', slug: 'aceite', nombre: 'Aceite', descripcion: 'Descripción',
    precio: 7990, precioAnterior: null, stock: 12, estado: 'PUBLICADO', destacado: false,
    alertaStockBajo: null, codigoBarras: null, origen: null, contenidoCantidad: null,
    contenidoUnidad: null, pesoDespachoGramos: null, fechaVencimiento: null,
    categoria: { id: 'cat-1', nombre: 'Despensa', slug: 'despensa' },
    marca: { id: 'marca-1', nombre: 'Marca', slug: 'marca', logoUrl: null },
    etiquetas: [],
    imagenes: [{ id: 'imagen-1', url: 'https://ejemplo.test/aceite.webp', storageKey: 'sumarket/productos/aceite-anterior', textoAlternativo: 'Aceite', orden: 1 }],
  }
  const repositorio = {
    async obtenerPorId() { return producto },
    async reemplazarImagenesPorProducto(_id, imagenes) {
      imagenesRecibidas = imagenes
      return producto
    },
  }
  const almacenamiento = {
    async eliminarImagenProducto(storageKey) { clavesEliminadas.push(storageKey) },
  }
  const servicio = crearServicioProductosAdmin(repositorio, almacenamiento)
  const imagenes = [{
    url: 'https://ejemplo.test/aceite.webp',
    storageKey: 'sumarket/productos/aceite-nuevo',
    textoAlternativo: 'Aceite',
  }]

  const actualizado = await servicio.reemplazarImagenesProducto('producto-1', imagenes)

  assert.equal(imagenesRecibidas, imagenes)
  assert.equal(actualizado.imagenes[0].orden, 1)
  assert.deepEqual(clavesEliminadas, ['sumarket/productos/aceite-anterior'])
})

test('reemplazarImagenesProducto no deja sin imágenes a un producto publicado', async () => {
  const producto = {
    id: 'producto-1', estado: 'PUBLICADO', imagenes: [{ storageKey: 'sumarket/productos/aceite' }],
  }
  const repositorio = { async obtenerPorId() { return producto } }
  const servicio = crearServicioProductosAdmin(repositorio)

  await assert.rejects(
    () => servicio.reemplazarImagenesProducto('producto-1', []),
    { code: 'PRODUCT_IMAGE_REQUIRED' },
  )
})

test('crearProducto genera slug, búsqueda y lo deja sin publicar', async () => {
  let datosCreacion
  const productoCreado = {
    id: 'producto-1', sku: 'TE-VERDE-250', slug: 'te-verde', nombre: 'Té verde',
    descripcion: 'Té de hoja.', precio: 3490, precioAnterior: null, stock: 10,
    estado: 'BORRADOR', destacado: false, alertaStockBajo: null, codigoBarras: null,
    origen: null, contenidoCantidad: null, contenidoUnidad: null, pesoDespachoGramos: null,
    fechaVencimiento: null, categoria: { id: 'cat-1', nombre: 'Despensa', slug: 'despensa' },
    marca: { id: 'marca-1', nombre: 'Marca', slug: 'marca', logoUrl: null },
    imagenes: [], etiquetas: [],
  }
  const repositorio = {
    async existeCategoriaActiva() { return true },
    async existeMarca() { return true },
    async crear(datos) {
      datosCreacion = datos
      return productoCreado
    },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const creado = await servicio.crearProducto({
    nombre: 'Té verde', sku: 'TE-VERDE-250', descripcion: 'Té de hoja.',
    precio: 3490, stock: 10, categoriaId: 'cat-1', marcaId: 'marca-1',
  })

  assert.equal(datosCreacion.slug, 'te-verde')
  assert.equal(datosCreacion.nombreBusqueda, 'te verde')
  assert.equal(datosCreacion.estado, 'BORRADOR')
  assert.equal(creado.estado, 'BORRADOR')
})

test('desactivarProducto conserva el registro y quita su destacado', async () => {
  let datosActualizacion
  const repositorio = {
    async obtenerPorId() { return { id: 'producto-1' } },
    async actualizarPorId(_id, datos) { datosActualizacion = datos },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const resultado = await servicio.desactivarProducto('producto-1')

  assert.equal(resultado, true)
  assert.deepEqual(datosActualizacion, { estado: 'ARCHIVADO', destacado: false })
})

test('restaurarProducto reactiva un archivado como borrador', async () => {
  let datos
  const repositorio = {
    async obtenerPorId() { return { id: 'producto-1', estado: 'ARCHIVADO' } },
    async actualizarPorId(_id, d) {
      datos = d
      return crearProductoAgotado({ estado: 'BORRADOR' })
    },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const producto = await servicio.restaurarProducto('producto-1')

  assert.deepEqual(datos, { estado: 'BORRADOR' })
  assert.equal(producto.estado, 'BORRADOR')
})

test('eliminarProducto borra en firme un producto sin ventas', async () => {
  let idEliminado
  const repositorio = {
    async obtenerPorId() { return { id: 'producto-1', imagenes: [] } },
    async contarVentas() { return 0 },
    async eliminarPorId(id) { idEliminado = id },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  const resultado = await servicio.eliminarProducto('producto-1')

  assert.equal(resultado, true)
  assert.equal(idEliminado, 'producto-1')
})

test('eliminarProducto rechaza si el producto tiene pedidos', async () => {
  let intentoBorrar = false
  const repositorio = {
    async obtenerPorId() { return { id: 'producto-1', imagenes: [] } },
    async contarVentas() { return 3 },
    async eliminarPorId() { intentoBorrar = true },
  }
  const servicio = crearServicioProductosAdmin(repositorio)

  await assert.rejects(servicio.eliminarProducto('producto-1'), { code: 'PRODUCT_HAS_SALES' })
  assert.equal(intentoBorrar, false)
})

test('eliminarProducto limpia las imágenes del producto tras borrarlo', async () => {
  const eliminadas = []
  const repositorio = {
    async obtenerPorId() {
      return { id: 'producto-1', imagenes: [{ storageKey: 'k1' }, { storageKey: 'k2' }, { storageKey: null }] }
    },
    async contarVentas() { return 0 },
    async eliminarPorId() {},
  }
  const almacenamiento = { async eliminarImagenProducto(clave) { eliminadas.push(clave) } }
  const servicio = crearServicioProductosAdmin(repositorio, almacenamiento)

  await servicio.eliminarProducto('producto-1')

  assert.deepEqual(eliminadas.sort(), ['k1', 'k2']) // ignora el storageKey nulo
})

test('eliminarProducto devuelve false si el producto no existe', async () => {
  const servicio = crearServicioProductosAdmin({ async obtenerPorId() { return null } })
  assert.equal(await servicio.eliminarProducto('fantasma'), false)
})

// Producto base agotado (stock 0) para probar el disparo de avisos al reponer.
function crearProductoAgotado(overrides = {}) {
  return {
    id: 'producto-1',
    sku: 'LEC-001', slug: 'leche', nombre: 'Leche', descripcion: 'Leche entera.',
    precio: 1290, precioAnterior: null, stock: 0, stockReservado: 0,
    estado: 'PUBLICADO', destacado: false, alertaStockBajo: null, codigoBarras: null,
    origen: null, contenidoCantidad: null, contenidoUnidad: null,
    pesoDespachoGramos: null, fechaVencimiento: null,
    categoria: { id: 'cat-1', nombre: 'Lácteos', slug: 'lacteos' },
    marca: { id: 'marca-1', nombre: 'Marca', slug: 'marca', logoUrl: null },
    imagenes: [{ url: 'x' }], etiquetas: [],
    ...overrides,
  }
}

test('actualizarProducto marca y dispara el barrido acotado al reponer (agotado -> disponible)', async () => {
  const producto = crearProductoAgotado()
  const repositorio = {
    async obtenerPorId() { return producto },
    async actualizarPorId(_id, datos) { return { ...producto, ...datos } },
  }
  let productoNotificado
  const avisos = {
    async marcarListosPorProducto(productoId) { productoNotificado = productoId },
  }
  let barridoDe
  const procesador = {
    async procesarReposiciones({ productoId }) { barridoDe = productoId },
  }
  const servicio = crearServicioProductosAdmin(repositorio, null, avisos, procesador)

  await servicio.actualizarProducto('producto-1', { stock: 10 })

  assert.equal(productoNotificado, 'producto-1')
  // El barrido se dispara acotado a este producto (no global).
  assert.equal(barridoDe, 'producto-1')
})

test('actualizarProducto no toca avisos ni barre si el producto ya tenía stock', async () => {
  const producto = crearProductoAgotado({ stock: 5 })
  const repositorio = {
    async obtenerPorId() { return producto },
    async actualizarPorId(_id, datos) { return { ...producto, ...datos } },
  }
  let marco = false
  let barrio = false
  const avisos = { async marcarListosPorProducto() { marco = true } }
  const procesador = { async procesarReposiciones() { barrio = true } }
  const servicio = crearServicioProductosAdmin(repositorio, null, avisos, procesador)

  await servicio.actualizarProducto('producto-1', { stock: 12 })

  assert.equal(marco, false)
  assert.equal(barrio, false)
})

test('actualizarProducto no dispara si el disponible sigue en cero (todo reservado)', async () => {
  const producto = crearProductoAgotado({ stock: 4, stockReservado: 4 })
  const repositorio = {
    async obtenerPorId() { return producto },
    async actualizarPorId(_id, datos) { return { ...producto, ...datos } },
  }
  let marco = false
  let barrio = false
  const avisos = { async marcarListosPorProducto() { marco = true } }
  const procesador = { async procesarReposiciones() { barrio = true } }
  const servicio = crearServicioProductosAdmin(repositorio, null, avisos, procesador)

  // Sube el stock pero la reserva lo consume: disponible sigue en 0.
  await servicio.actualizarProducto('producto-1', { stock: 8, stockReservado: 8 })

  assert.equal(marco, false)
  assert.equal(barrio, false)
})
