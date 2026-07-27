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
 * @property {string}        categoria     - Categoría a la que pertenece.
 * @property {string}        descripcion   - Descripción larga.
 * @property {number|null}   precioAnterior - Precio previo si está en oferta; null si no.
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
    categoria: p.category,
    descripcion: p.description,
    // La Fake Store API no trae ofertas. Simulamos una en los ids pares: un
    // precio anterior 25% más alto, para mostrar el badge "Oferta" y el precio
    // tachado. En la Fase 2 (backend propio) esto será un dato real.
    precioAnterior:
      p.id % 2 === 0 ? Math.round(p.price * 1.25 * 100) / 100 : null,
  };
}
