import { Router } from 'express'
import {
  LIMITE_MAXIMO_POR_PAGINA,
  ORDEN_PREDETERMINADO,
  ORDENES_PERMITIDOS,
  PAGINACION_PREDETERMINADA,
  listarProductos,
  obtenerFacetas,
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

function leerNumeroNoNegativo(valor) {
  if (valor === undefined) {
    return undefined
  }

  const numero = typeof valor === 'string' ? Number(valor) : Number.NaN

  return Number.isFinite(numero) && numero >= 0 ? numero : null
}

productosRouter.get('/', async (request, response, next) => {
  // La ruta traduce parámetros HTTP; el servicio recibe valores simples y no conoce Express.
  const query = typeof request.query.q === 'string' ? request.query.q : ''
  const categoria =
    typeof request.query.categoria === 'string' ? request.query.categoria : ''
  const subcategoria =
    typeof request.query.subcategoria === 'string' ? request.query.subcategoria : ''
  const subcategoriaHija =
    typeof request.query.subcategoriaHija === 'string' ? request.query.subcategoriaHija : ''
  // marca acepta varias separadas por coma: ?marca=kraft,nestle
  const marca =
    typeof request.query.marca === 'string' && request.query.marca.trim()
      ? request.query.marca.split(',').map((valor) => valor.trim()).filter(Boolean)
      : []
  const soloOfertas = request.query.ofertas === 'true'
  const soloDisponibles = request.query.disponibles === 'true'
  const precioMin = leerNumeroNoNegativo(request.query.precioMin)
  const precioMax = leerNumeroNoNegativo(request.query.precioMax)
  const orden =
    typeof request.query.orden === 'string' ? request.query.orden : ORDEN_PREDETERMINADO
  const page = leerEnteroPositivo(
    request.query.page,
    PAGINACION_PREDETERMINADA.page,
  )
  const limit = leerEnteroPositivo(
    request.query.limit,
    PAGINACION_PREDETERMINADA.limit,
    LIMITE_MAXIMO_POR_PAGINA,
  )

  if (
    page === null ||
    limit === null ||
    precioMin === null ||
    precioMax === null ||
    (precioMin !== undefined && precioMax !== undefined && precioMin > precioMax)
  ) {
    return response.status(400).json({
      error: {
        code: 'INVALID_QUERY_PARAM',
        message: `page debe ser un entero positivo, limit debe estar entre 1 y ${LIMITE_MAXIMO_POR_PAGINA}, y el rango de precio debe ser válido.`,
      },
    })
  }

  if (!ORDENES_PERMITIDOS.has(orden)) {
    return response.status(400).json({
      error: {
        code: 'INVALID_QUERY_PARAM',
        message: 'orden debe ser relevancia, precio-asc, precio-desc o nombre-asc.',
      },
    })
  }

  try {
    const catalogo = await listarProductos({
      query,
      categoria,
      subcategoria,
      subcategoriaHija,
      marca,
      soloOfertas,
      soloDisponibles,
      precioMin,
      precioMax,
      page,
      limit,
      orden,
    })

    return response.json(catalogo)
  } catch (error) {
    return next(error)
  }
})

// Facetas del sidebar del catálogo (marcas + rango de precio) para un contexto.
// Debe ir ANTES de '/:slug' para no ser capturada como un slug de producto.
productosRouter.get('/facetas', async (request, response, next) => {
  const query = typeof request.query.q === 'string' ? request.query.q : ''
  const categoria = typeof request.query.categoria === 'string' ? request.query.categoria : ''
  const subcategoria =
    typeof request.query.subcategoria === 'string' ? request.query.subcategoria : ''
  const subcategoriaHija =
    typeof request.query.subcategoriaHija === 'string' ? request.query.subcategoriaHija : ''
  const soloOfertas = request.query.ofertas === 'true'
  const soloDisponibles = request.query.disponibles === 'true'

  try {
    const facetas = await obtenerFacetas({ query, categoria, subcategoria, subcategoriaHija, soloOfertas, soloDisponibles })
    return response.json({ data: facetas })
  } catch (error) {
    return next(error)
  }
})

productosRouter.get('/:slug', async (request, response, next) => {
  // El slug identifica el recurso público que aparece en la URL del detalle.
  let producto

  try {
    producto = await obtenerProductoPorSlug(request.params.slug)
  } catch (error) {
    return next(error)
  }

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
