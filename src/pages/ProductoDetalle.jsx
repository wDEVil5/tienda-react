import { useParams, Link } from "react-router-dom";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import ImagenProducto from "../components/ImagenProducto.jsx";
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
  const descuento = enOferta
    ? Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    : 0;
  const ahorro = enOferta ? producto.precioAnterior - producto.precio : 0;

  return (
    <section className={styles.detalle}>
      <div className={styles.topBar}>
        <nav className={styles.miga} aria-label="Ruta de navegación">
          <Link to="/">Tienda</Link>
          <span aria-hidden="true">/</span>
          <span className={styles.migaCat}>{producto.categoria}</span>
          <span aria-hidden="true">/</span>
          <span className={styles.migaActual}>{producto.nombre}</span>
        </nav>

        <Link to="/" className={styles.volver}>
          ← Volver al catálogo
        </Link>
      </div>

      <div className={styles.contenido}>
        {/* Columna izquierda: imagen. Una sola foto por ahora; la galería de
            miniaturas del handoff requiere varias imágenes (backend, Fase 2). */}
        <div className={styles.imagenWrap}>
          <ImagenProducto
            className={styles.imagen}
            src={producto.imagen}
            alt={producto.nombre}
          />
          {enOferta && <span className={styles.badge}>−{descuento}%</span>}
        </div>

        {/* Columna derecha: info */}
        <div className={styles.info}>
          <p className={styles.eyebrow}>
            {producto.categoria} · SKU {producto.id}
          </p>
          <h1 className={styles.nombre}>{producto.nombre}</h1>

          <div className={styles.precios}>
            <span className={styles.precio}>
              ${producto.precio.toLocaleString("es-CL")}
            </span>
            {enOferta && (
              <>
                <span className={styles.precioAntes}>
                  ${producto.precioAnterior.toLocaleString("es-CL")}
                </span>
                <span className={styles.ahorro}>
                  Ahorras ${ahorro.toLocaleString("es-CL")}
                </span>
              </>
            )}
          </div>

          {/* Stock estático por ahora; será dato real con el backend (Fase 2). */}
          <p className={styles.stock}>
            <span className={styles.punto} aria-hidden="true"></span>
            En stock
          </p>

          <button
            className={styles.boton}
            onClick={() => agregarAlCarrito(producto)}
          >
            Agregar al carrito
          </button>

          <div className={styles.infoBox}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Retiro hoy</span>
              <span>Gratis en tienda, listo en ~2 h</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Despacho</span>
              <span>$2.990 · gratis sobre $20.000</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Devolución</span>
              <span>Hasta 30 días</span>
            </div>
          </div>

          <p className={styles.descripcion}>{producto.descripcion}</p>
        </div>
      </div>
    </section>
  );
}

export default ProductoDetalle;
