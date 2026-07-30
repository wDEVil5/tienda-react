import { Router } from 'express'
import {
  LIMITE_MAXIMO_POR_PAGINA,
  PAGINACION_PREDETERMINADA,
  listarProductos,
  obtenerProductoPorSlug,
} from './productos.service.js'

const productosRouter = Router()

function leerEnteroPositivo(valor, valorPredeterminado, limiteMaximo = Infinity) {
  if (valor === undefined) {
    return valorPredeterminado
  }

  const numero = typeof valor === 'string' ? Number(valor) : Number.NaN

  return Number.isInteger(numero) && numero > 0 && numero <= limiteMaximo ? numero : null
}

productosRouter.get('/', (request, response) => {
  // La ruta traduce parámetros HTTP; el servicio recibe valores simples y no conoce Express.
  const query = typeof request.query.q === 'string' ? request.query.q : ''
  const categoria =
    typeof request.query.categoria === 'string' ? request.query.categoria : ''
  const soloOfertas = request.query.ofertas === 'true'
  const page = leerEnteroPositivo(
    request.query.page,
    PAGINACION_PREDETERMINADA.page,
  )
  const limit = leerEnteroPositivo(
    request.query.limit,
    PAGINACION_PREDETERMINADA.limit,
    LIMITE_MAXIMO_POR_PAGINA,
  )

  if (page === null || limit === null) {
    return response.status(400).json({
      error: {
        code: 'INVALID_QUERY_PARAM',
        message: `page debe ser un entero positivo y limit debe estar entre 1 y ${LIMITE_MAXIMO_POR_PAGINA}.`,
      },
    })
  }

  return response.json(
    listarProductos({ query, categoria, soloOfertas, page, limit }),
  )
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
