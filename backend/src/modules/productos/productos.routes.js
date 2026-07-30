import { Router } from 'express'
import { listarProductos, obtenerProductoPorSlug } from './productos.service.js'

const productosRouter = Router()

productosRouter.get('/', (_request, response) => {
  response.json({ data: listarProductos() })
})

productosRouter.get('/:slug', (request, response) => {
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
