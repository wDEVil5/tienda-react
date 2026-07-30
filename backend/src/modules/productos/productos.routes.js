import { Router } from 'express'
import { listarProductos, obtenerProductoPorSlug } from './productos.service.js'

const productosRouter = Router()

productosRouter.get('/', (request, response) => {
  // La ruta traduce parámetros HTTP; el servicio recibe valores simples y no conoce Express.
  const query = typeof request.query.q === 'string' ? request.query.q : ''
  const categoria =
    typeof request.query.categoria === 'string' ? request.query.categoria : ''
  const soloOfertas = request.query.ofertas === 'true'

  response.json({ data: listarProductos({ query, categoria, soloOfertas }) })
})

productosRouter.get('/:slug', (request, response) => {
  // El slug identifica el recurso público que aparece en la URL del detalle.
  const producto = obtenerProductoPorSlug(request.params.slug)

  if (!producto) {
    return response.status(404).json({
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'No encontramos el producto solicitado.',
      },
    })
  }

  return response.json({ data: producto })
})

export default productosRouter
