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
        imagenes: [{ id: 'imagen-1', url: 'https://ejemplo.test/aceite.jpg', storageKey: 'sumarket/productos/aceite', textoAlternativo: 'Aceite', orden: 1 }],
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
    precio: 7990, precioAnterior: 9990, stock: 12, activo: true, destacado: false,
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

test('reemplazarImagenesProducto delega una galería completa al repositorio', async () => {
  let imagenesRecibidas
  const clavesEliminadas = []
  const producto = {
    id: 'producto-1', sku: 'ACE-001', slug: 'aceite', nombre: 'Aceite', descripcion: 'Descripción',
    precio: 7990, precioAnterior: null, stock: 12, activo: true, destacado: false,
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

test('crearProducto genera slug, búsqueda y lo deja sin publicar', async () => {
  let datosCreacion
  const productoCreado = {
    id: 'producto-1', sku: 'TE-VERDE-250', slug: 'te-verde', nombre: 'Té verde',
    descripcion: 'Té de hoja.', precio: 3490, precioAnterior: null, stock: 10,
    activo: false, destacado: false, alertaStockBajo: null, codigoBarras: null,
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
  assert.equal(datosCreacion.activo, false)
  assert.equal(creado.activo, false)
})
