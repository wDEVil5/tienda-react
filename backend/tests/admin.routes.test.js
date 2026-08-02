import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { crearRouterAdmin } from '../src/modules/admin/admin.routes.js'

function crearAppAdmin({ producto = null, rol = 'ADMIN' } = {}) {
  const app = express()
  const middlewareSesion = (request, _response, next) => {
    request.usuario = { id: 'usuario-1', rol }
    next()
  }
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion,
    servicio: { async obtenerProductoParaEdicion() { return producto } },
  }))
  return app
}

test('GET /api/admin/productos/:id entrega datos para edición a un administrador', async () => {
  const response = await request(crearAppAdmin({ producto: { id: 'producto-1', estado: 'BORRADOR' } }))
    .get('/api/admin/productos/producto-1')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { data: { id: 'producto-1', estado: 'BORRADOR' } })
})

test('GET /api/admin/productos/:id informa cuando no existe', async () => {
  const response = await request(crearAppAdmin()).get('/api/admin/productos/producto-1')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ADMIN_PRODUCT_NOT_FOUND')
})

test('GET /api/admin/referencias/producto entrega opciones para el editor', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'OPERADOR' }
      next()
    },
    servicio: {
      async listarOpcionesProductoAdmin() {
        return { data: { categorias: [], marcas: [], etiquetas: [] } }
      },
    },
  }))

  const response = await request(app).get('/api/admin/referencias/producto')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { data: { categorias: [], marcas: [], etiquetas: [] } })
})

test('GET /api/admin/promociones entrega campañas al personal autorizado', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'OPERADOR' }
      next()
    },
    servicio: {
      async listarPromocionesAdmin() {
        return { data: [{ id: 'promo-1', productosAsignados: 3 }] }
      },
    },
  }))

  const response = await request(app).get('/api/admin/promociones')

  assert.equal(response.status, 200)
  assert.equal(response.body.data[0].productosAsignados, 3)
})

test('GET /api/admin/promociones/:id entrega una campaña para edición', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'OPERADOR' }
      next()
    },
    servicio: {
      async obtenerPromocionParaEdicionAdmin() {
        return { id: 'promo-1', productoIds: ['producto-1'] }
      },
    },
  }))

  const response = await request(app).get('/api/admin/promociones/promo-1')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.data.productoIds, ['producto-1'])
})

test('POST /api/admin/promociones crea una campaña validada e inactiva', async () => {
  let datosRecibidos
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async crearPromocionAdmin(datos) {
        datosRecibidos = datos
        return { id: 'promo-1', activa: false }
      },
    },
  }))

  const response = await request(app).post('/api/admin/promociones').send({
    nombre: 'Ofertas de agosto', porcentajeDescuento: 25,
    empiezaEn: '2026-08-01T00:00:00.000Z', terminaEn: '2026-08-08T00:00:00.000Z',
    productoIds: ['550e8400-e29b-41d4-a716-446655440000'],
  })

  assert.equal(response.status, 201)
  assert.equal(datosRecibidos.productoIds.length, 1)
  assert.equal(response.body.data.activa, false)
})

test('PATCH /api/admin/promociones/:id actualiza una campaña inactiva', async () => {
  let cambiosRecibidos
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async actualizarPromocionAdmin(_id, cambios) {
        cambiosRecibidos = cambios
        return { id: 'promo-1', porcentajeDescuento: cambios.porcentajeDescuento }
      },
    },
  }))

  const response = await request(app).patch('/api/admin/promociones/promo-1').send({ porcentajeDescuento: 30 })

  assert.equal(response.status, 200)
  assert.equal(cambiosRecibidos.porcentajeDescuento, 30)
})

test('PATCH /api/admin/promociones/:id/activar activa una campaña sin conflicto', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: { async activarPromocionAdmin() { return { id: 'promo-1', activa: true } } },
  }))

  const response = await request(app).patch('/api/admin/promociones/promo-1/activar')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.activa, true)
})

test('PATCH /api/admin/promociones/:id/desactivar detiene una campaña existente', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: { async desactivarPromocionAdmin() { return { id: 'promo-1', activa: false } } },
  }))

  const response = await request(app).patch('/api/admin/promociones/promo-1/desactivar')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.activa, false)
})

test('GET /api/admin/productos devuelve el listado administrativo paginado', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async listarProductosAdmin({ page, limit, query, estado }) {
        return { data: [{ id: 'producto-1', estado, query }], meta: { page, limit, total: 1, totalPages: 1 } }
      },
    },
  }))

  const response = await request(app).get('/api/admin/productos?page=2&limit=10&q=cafe&estado=ARCHIVADO')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.meta, { page: 2, limit: 10, total: 1, totalPages: 1 })
  assert.equal(response.body.data[0].estado, 'ARCHIVADO')
  assert.equal(response.body.data[0].query, 'cafe')
})

test('GET /api/admin/productos rechaza paginación inválida', async () => {
  const response = await request(crearAppAdmin()).get('/api/admin/productos?limit=0')

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_QUERY_PARAM')
})

test('GET /api/admin/productos rechaza un estado desconocido', async () => {
  const response = await request(crearAppAdmin()).get('/api/admin/productos?estado=ELIMINADO')

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'INVALID_QUERY_PARAM')
})

test('POST /api/admin/productos crea un producto validado sin publicarlo', async () => {
  let datosRecibidos
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async crearProducto(datos) {
        datosRecibidos = datos
        return { id: 'producto-1', nombre: datos.nombre, estado: 'BORRADOR' }
      },
    },
  }))

  const response = await request(app)
    .post('/api/admin/productos')
    .send({
      nombre: 'Té verde', sku: 'TE-VERDE-250', descripcion: 'Té de hoja.',
      precio: 3490, stock: 10,
      categoriaId: '550e8400-e29b-41d4-a716-446655440000',
      marcaId: '550e8400-e29b-41d4-a716-446655440001',
    })

  assert.equal(response.status, 201)
  assert.equal(datosRecibidos.sku, 'TE-VERDE-250')
  assert.equal(response.body.data.estado, 'BORRADOR')
})

test('PATCH /api/admin/productos/:id valida y entrega el producto actualizado', async () => {
  let cambiosRecibidos
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async actualizarProducto(_id, cambios) {
        cambiosRecibidos = cambios
        return { id: 'producto-1', stock: cambios.stock }
      },
    },
  }))

  const response = await request(app)
    .patch('/api/admin/productos/producto-1')
    .send({ stock: 8 })

  assert.equal(response.status, 200)
  assert.equal(cambiosRecibidos.stock, 8)
  assert.deepEqual(response.body, { data: { id: 'producto-1', stock: 8 } })
})

test('PATCH /api/admin/productos/:id rechaza datos inválidos antes de guardar', async () => {
  const app = crearAppAdmin()

  const response = await request(app)
    .patch('/api/admin/productos/producto-1')
    .send({ stock: -1 })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_PRODUCT_DATA')
})

test('DELETE /api/admin/productos/:id realiza una baja lógica', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: { async desactivarProducto() { return true } },
  }))

  const response = await request(app).delete('/api/admin/productos/producto-1')

  assert.equal(response.status, 204)
})

test('DELETE /api/admin/productos/:id responde 404 si no existe', async () => {
  const app = express()
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: { async desactivarProducto() { return false } },
  }))

  const response = await request(app).delete('/api/admin/productos/inexistente')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'ADMIN_PRODUCT_NOT_FOUND')
})

test('PUT /api/admin/productos/:id/imagenes reemplaza la galería validada', async () => {
  let imagenesRecibidas
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async reemplazarImagenesProducto(_id, imagenes) {
        imagenesRecibidas = imagenes
        return { id: 'producto-1', imagenes }
      },
    },
  }))

  const response = await request(app)
    .put('/api/admin/productos/producto-1/imagenes')
    .send({ imagenes: [{ url: 'https://cdn.ejemplo.test/aceite.webp', textoAlternativo: 'Aceite' }] })

  assert.equal(response.status, 200)
  assert.equal(imagenesRecibidas.length, 1)
})

test('POST /api/admin/imagenes acepta un archivo del editor y devuelve su referencia', async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async subirImagenProducto(archivo) {
        return { url: `https://cdn.ejemplo.test/${archivo.originalname}`, storageKey: 'sumarket/productos/aceite' }
      },
    },
  }))

  const response = await request(app)
    .post('/api/admin/imagenes')
    .attach('imagen', Buffer.from('archivo-simulado'), {
      filename: 'aceite.webp',
      contentType: 'image/webp',
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.storageKey, 'sumarket/productos/aceite')
})

test('POST /api/admin/imagenes rechaza archivos que no son imágenes permitidas', async () => {
  const app = crearAppAdmin()

  const response = await request(app)
    .post('/api/admin/imagenes')
    .attach('imagen', Buffer.from('texto'), { filename: 'texto.txt', contentType: 'text/plain' })

  assert.equal(response.status, 422)
  assert.equal(response.body.error.code, 'INVALID_IMAGE_FILE')
})

test('POST /api/admin/imagenes permite declarar una imagen PNG', async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/admin', crearRouterAdmin({
    middlewareSesion: (request, _response, next) => {
      request.usuario = { id: 'usuario-1', rol: 'ADMIN' }
      next()
    },
    servicio: {
      async subirImagenProducto() {
        return { url: 'https://cdn.ejemplo.test/aceite.png', storageKey: 'sumarket/productos/aceite' }
      },
    },
  }))

  const response = await request(app)
    .post('/api/admin/imagenes')
    .attach('imagen', Buffer.from('archivo-simulado'), {
      filename: 'aceite.png',
      contentType: 'image/png',
    })

  assert.equal(response.status, 201)
})
