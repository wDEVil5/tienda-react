import { describe, expect, it } from 'vitest'
import { normalizarProductoApi } from './producto.js'

describe('normalizarProductoApi', () => {
  it('adapta categoría e imágenes de la API al contrato de la interfaz', () => {
    const producto = normalizarProductoApi({
      id: 'prod_aceite_oliva_500',
      nombre: 'Aceite de oliva extra virgen 500 ml',
      precio: 7990,
      precioAnterior: 9990,
      categoria: { id: 'cat_despensa', nombre: 'Despensa', slug: 'despensa' },
      descripcion: 'Aceite prensado en frío.',
      stock: 12,
      contenidoCantidad: 500,
      contenidoUnidad: 'ml',
      precioPorUnidad: { monto: 15980, unidad: 'L' },
      imagenes: [
        { url: 'https://ejemplo.cl/lateral.jpg', alt: 'Vista lateral', orden: 2 },
        { url: 'https://ejemplo.cl/frontal.jpg', alt: 'Vista frontal', orden: 1 },
      ],
    })

    expect(producto).toMatchObject({
      id: 'prod_aceite_oliva_500',
      categoria: 'Despensa',
      categoriaSlug: 'despensa',
      imagen: 'https://ejemplo.cl/frontal.jpg',
      imagenes: [
        'https://ejemplo.cl/frontal.jpg',
        'https://ejemplo.cl/lateral.jpg',
      ],
      sku: 'prod_aceite_oliva_500',
      stock: 12,
      contenidoCantidad: 500,
      contenidoUnidad: 'ml',
      precioPorUnidad: { monto: 15980, unidad: 'L' },
    })
  })
})
