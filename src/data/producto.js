// CONTRATO DE DATOS — la forma de un "producto" en toda la app.
//
// Este es el único lugar donde se define qué campos tiene un producto y cómo se
// traduce desde una fuente externa. La UI (Catálogo, Carrito, Ficha...) SOLO
// conoce esta forma; nunca los campos crudos de la API.
//
// Por eso migrar de Fake Store al backend propio (Fase 2) será cambiar SOLO la
// función normalizadora de aquí, sin tocar los componentes.

/**
 * Un producto tal como lo consume la aplicación.
 * @typedef {Object} Producto
 * @property {number|string} id            - Identificador único.
 * @property {string}        nombre        - Nombre visible del producto.
 * @property {number}        precio        - Precio actual (número, sin símbolo).
 * @property {string}        imagen        - URL de la imagen principal.
 * @property {string[]}      imagenes      - Galería (máximo 5; la primera es principal).
 * @property {string}        categoria     - Categoría a la que pertenece.
 * @property {string}        descripcion   - Descripción larga.
 * @property {number|null}   precioAnterior - Precio previo si está en oferta; null si no.
 * @property {string}        sku           - Código visible para inventario y administración.
 * @property {number}        stock         - Unidades disponibles informadas por la API.
 */

/**
 * Normaliza un producto crudo de la Fake Store API al contrato de la app.
 * @param {Object} p - Objeto crudo tal como llega de fakestoreapi.com.
 * @returns {Producto}
 */
export function normalizarProductoFakeStore(p) {
  return {
    id: p.id,
    nombre: p.title,
    precio: p.price,
    imagen: p.image,
    // Fake Store entrega una sola imagen. El contrato ya usa un arreglo para
    // que el backend pueda entregar una galería sin cambiar la UI.
    imagenes: p.image ? [p.image] : [],
    categoria: p.category,
    descripcion: p.description,
    // La Fake Store API no trae ofertas. Simulamos una en los ids pares: el
    // precio anterior deja el actual con 25% de descuento. En la Fase 2
    // (backend propio) este valor llegará como dato real.
    precioAnterior:
      p.id % 2 === 0 ? Math.round((p.price / 0.75) * 100) / 100 : null,
  };
}

/**
 * Traduce la respuesta de la API propia al contrato que ya consume la UI.
 * La API entrega objetos para categoría e imágenes; los componentes actuales
 * mantienen nombres simples y un arreglo de URLs para evitar una migración masiva.
 * @param {Object} producto - Producto público recibido desde GET /api/productos.
 * @returns {Producto}
 */
export function normalizarProductoApi(producto) {
  // Se copia antes de ordenar para no modificar la respuesta recibida de la API.
  const imagenes = [...producto.imagenes]
    .sort((imagenA, imagenB) => imagenA.orden - imagenB.orden)
    .map((imagen) => imagen.url)
    .filter(Boolean);

  return {
    id: producto.id,
    nombre: producto.nombre,
    precio: producto.precio,
    imagen: imagenes[0] ?? '',
    imagenes,
    categoria: producto.categoria.nombre,
    descripcion: producto.descripcion,
    precioAnterior: producto.precioAnterior,
    // La API incorporará SKU explícito antes de persistir productos; este
    // fallback mantiene la ficha usable mientras uso datos temporales.
    sku: producto.sku ?? producto.id,
    stock: producto.stock,
  };
}
