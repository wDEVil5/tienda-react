import { useParams, Link } from "react-router-dom";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import styles from "./ProductoDetalle.module.css";

function ProductoDetalle({ productos }) {
  // useParams lee las partes variables de la URL. El :id de /producto/:id
  // llega SIEMPRE como string, por eso lo convertimos con Number() para comparar.
  const { id } = useParams();
  const { agregarAlCarrito } = useCarritoContext();

  const producto = productos.find((p) => p.id === Number(id));

  // La URL podría apuntar a un id que no existe (link viejo, id inventado).
  if (!producto) {
    return (
      <section className={styles.noEncontrado}>
        <p>No encontramos ese producto.</p>
        <Link to="/" className={styles.volver}>
          ← Volver al catálogo
        </Link>
      </section>
    );
  }

  const enOferta = producto.precioAnterior !== null;

  return (
    <section className={styles.detalle}>
      <Link to="/" className={styles.volver}>
        ← Volver al catálogo
      </Link>

      <div className={styles.contenido}>
        <div className={styles.imagenWrap}>
          <img
            className={styles.imagen}
            src={producto.imagen}
            alt={producto.nombre}
          />
          {enOferta && <span className={styles.badge}>Oferta</span>}
        </div>

        <div className={styles.info}>
          <p className={styles.categoria}>{producto.categoria}</p>
          <h1 className={styles.nombre}>{producto.nombre}</h1>

          <div className={styles.precios}>
            <span className={styles.precio}>
              ${producto.precio.toLocaleString("es-CL")}
            </span>
            {enOferta && (
              <span className={styles.precioAntes}>
                ${producto.precioAnterior.toLocaleString("es-CL")}
              </span>
            )}
          </div>

          <p className={styles.descripcion}>{producto.descripcion}</p>

          <button
            className={styles.boton}
            onClick={() => agregarAlCarrito(producto)}
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </section>
  );
}

export default ProductoDetalle;
