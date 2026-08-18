import test from 'node:test'
import assert from 'node:assert/strict'
import { crearServicioProductos } from '../src/modules/productos/productos.service.js'
import { normalizarTextoBusqueda } from '../src/lib/texto.js'
import { productos } from './fixtures/productos.fixture.js'

function crearRepositorioEnMemoria() {
  return {
    async listarPublicados({ page = 1, limit = 12, orden = 'relevancia', ...filtros } = {}) {
      const productosFiltrados = filtrarProductos(filtros)
      const productosOrdenados = ordenarProductos(productosFiltrados, orden)

      return productosOrdenados.slice((page - 1) * limit, page * limit)
    },
    async contarPublicados(filtros = {}) {
      return filtrarProductos(filtros).length
    },
    async obtenerMaximoDescuentoVigente() {
      return Math.max(
        ...productos
          .filter((producto) => producto.estado === 'PUBLICADO' && producto.oferta)
          .map((producto) => producto.oferta.porcentajeDescuento),
      )
    },
    async obtenerPublicadoPorSlug(slug) {
      return productos.find(
        (producto) => producto.estado === 'PUBLICADO' && producto.slug === slug,
      ) ?? null
    },
    async masVendidosPublicados({ limit = 12 } = {}) {
      // Simula un ranking ya resuelto por la base: publicados en orden fijo,
      // recortado al límite. La lógica real (groupBy) vive en el repositorio.
      return productos.filter((producto) => producto.estado === 'PUBLICADO').slice(0, limit)
    },
    async similaresPublicados({ slug, limit = 8 }) {
      // La resolución subcategoría/categoría vive en el repositorio real; aquí
      // basta con publicados que no sean el producto base.
      return productos
        .filter((producto) => producto.estado === 'PUBLICADO' && producto.slug !== slug)
        .slice(0, limit)
    },
  }
}

function filtrarProductos({ query, categoria, soloOfertas, precioMin, precioMax } = {}) {
  // Imita el contrato del repositorio real sin requerir PostgreSQL en estos tests.
  return productos
    .filter((producto) => producto.estado === 'PUBLICADO')
    .filter(
      (producto) => !query || normalizarTextoBusqueda(producto.nombre).includes(query),
    )
    .filter((producto) => !categoria || producto.categoria.slug === categoria)
    .filter((producto) => !soloOfertas || producto.oferta !== null)
    .filter((producto) => precioMin === undefined || producto.precio >= precioMin)
    .filter((producto) => precioMax === undefined || producto.precio <= precioMax)
}

function ordenarProductos(productosParaOrdenar, orden) {
  if (orden === 'relevancia') {
    return productosParaOrdenar
  }

  return [...productosParaOrdenar].sort((productoA, productoB) => {
    if (orden === 'precio-asc') return productoA.precio - productoB.precio
    if (orden === 'precio-desc') return productoB.precio - productoA.precio
    return productoA.nombre.localeCompare(productoB.nombre, 'es')
  })
}

const servicioEnMemoria = crearServicioProductos(crearRepositorioEnMemoria())

test('listarProductos excluye productos que no están publicados', async () => {
  const { data: resultado } = await servicioEnMemoria.listarProductos()

  assert.equal(resultado.length, 5)
  assert.equal(resultado.some((producto) => producto.slug === 'mermelada-de-frutilla-250-g'), false)
  assert.equal(resultado.every((producto) => !('estado' in producto)), true)
})

test('listarProductos busca sin distinguir mayúsculas ni acentos', async () => {
  const { data: resultado } = await servicioEnMemoria.listarProductos({ query: 'CAFÉ' })

  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].slug, 'cafe-de-grano-tostado-250-g')
})

test('listarProductos filtra y combina categorías por slug', async () => {
  const { data: resultado } = await servicioEnMemoria.listarProductos({ query: 'leche', categoria: 'LÁCTEOS' })

  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].slug, 'leche-entera-1-l')
})

test('listarProductos filtra productos con oferta vigente', async () => {
  const { data: resultado, meta } = await servicioEnMemoria.listarProductos({ soloOfertas: true })

  assert.equal(resultado.length, 2)
  assert.equal(resultado.every((producto) => producto.oferta !== null), true)
  assert.equal(meta.maxDescuento, 25)
})

test('listarProductos filtra por un rango de precio inclusivo', async () => {
  const { data: resultado } = await servicioEnMemoria.listarProductos({ precioMin: 4000, precioMax: 6000 })

  assert.deepEqual(
    resultado.map((producto) => producto.slug),
    ['cafe-de-grano-tostado-250-g', 'leche-entera-1-l'],
  )
})

test('listarProductos devuelve copias seguras de los datos', async () => {
  const { data: primerResultado } = await servicioEnMemoria.listarProductos()
  primerResultado[0].categoria.nombre = 'Categoría modificada'

  const { data: segundoResultado } = await servicioEnMemoria.listarProductos()

  assert.equal(segundoResultado[0].categoria.nombre, 'Despensa')
})

test('listarProductos pagina después de aplicar filtros', async () => {
  const resultado = await servicioEnMemoria.listarProductos({ page: 2, limit: 2 })

  assert.equal(resultado.data.length, 2)
  assert.deepEqual(resultado.meta, {
    page: 2,
    limit: 2,
    total: 5,
    totalPages: 3,
  })
})

test('listarProductos ordena antes de paginar', async () => {
  const resultado = await servicioEnMemoria.listarProductos({ orden: 'precio-desc', page: 1, limit: 2 })

  assert.deepEqual(
    resultado.data.map((producto) => producto.slug),
    ['detergente-liquido-concentrado-3-l', 'aceite-oliva-extra-virgen-500-ml'],
  )
})

test('obtenerSimilares excluye el producto base y entrega copia pública (sin estado)', async () => {
  const resultado = await servicioEnMemoria.obtenerSimilares('aceite-oliva-extra-virgen-500-ml', { limit: 2 })

  assert.equal(resultado.length, 2)
  assert.ok(resultado.every((producto) => producto.slug !== 'aceite-oliva-extra-virgen-500-ml'))
  assert.ok(resultado.every((producto) => !('estado' in producto)))
})

test('obtenerMasVendidos respeta el límite y no filtra el estado', async () => {
  const resultado = await servicioEnMemoria.obtenerMasVendidos({ limit: 3 })

  assert.equal(resultado.length, 3)
  assert.equal(resultado.every((producto) => !('estado' in producto)), true)
})

test('obtenerMasVendidos devuelve copias seguras de los datos', async () => {
  const primero = await servicioEnMemoria.obtenerMasVendidos({ limit: 1 })
  primero[0].categoria.nombre = 'Categoría modificada'

  const segundo = await servicioEnMemoria.obtenerMasVendidos({ limit: 1 })

  assert.notEqual(segundo[0].categoria.nombre, 'Categoría modificada')
})

test('obtenerProductoPorSlug devuelve solo productos publicados', async () => {
  const producto = await servicioEnMemoria.obtenerProductoPorSlug('aceite-oliva-extra-virgen-500-ml')
  const productoInactivo = await servicioEnMemoria.obtenerProductoPorSlug('mermelada-de-frutilla-250-g')

  assert.equal(producto?.nombre, 'Aceite de oliva extra virgen 500 ml')
  assert.equal(productoInactivo, null)
})

test('listarProductos cae a la subcategoría cuando la hija no tiene productos (fallback de tercer nivel)', async () => {
  const unoPublicado = productos.find((producto) => producto.estado === 'PUBLICADO')
  const repositorio = {
    // Con filtro de hija no hay nada; sin él (fallback) sí aparece el producto.
    async listarPublicados(filtros = {}) {
      return filtros.subcategoriaHija ? [] : [unoPublicado]
    },
    async contarPublicados(filtros = {}) {
      return filtros.subcategoriaHija ? 0 : 1
    },
    async obtenerMaximoDescuentoVigente() {
      return null
    },
  }
  const servicio = crearServicioProductos(repositorio)

  const { data, meta } = await servicio.listarProductos({
    subcategoria: 'leche',
    subcategoriaHija: 'leche-entera',
  })

  assert.equal(meta.total, 1)
  assert.equal(data.length, 1)
  assert.equal(data[0].slug, unoPublicado.slug)
})

test('listarProductos respeta el filtro de hija cuando sí tiene productos', async () => {
  const unoPublicado = productos.find((producto) => producto.estado === 'PUBLICADO')
  let listadosSinHija = 0
  const repositorio = {
    async listarPublicados(filtros = {}) {
      if (!filtros.subcategoriaHija) listadosSinHija += 1
      return [unoPublicado]
    },
    async contarPublicados() {
      return 1
    },
    async obtenerMaximoDescuentoVigente() {
      return null
    },
  }
  const servicio = crearServicioProductos(repositorio)

  await servicio.listarProductos({ subcategoria: 'leche', subcategoriaHija: 'leche-entera' })

  // No debe reintentar sin la hija: el tercer nivel filtró de verdad.
  assert.equal(listadosSinHija, 0)
})
