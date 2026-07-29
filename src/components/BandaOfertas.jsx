import styles from "./BandaOfertas.module.css";
import ImagenProducto from "./ImagenProducto.jsx";
import { Link } from "react-router-dom";

// Banda de ofertas del Home. Deriva las ofertas reales (las que tienen
// precioAnterior) para el conteo y las mini-tarjetas.
function BandaOfertas({ productos, onVerOfertas }) {
  const ofertas = productos.filter((p) => p.precioAnterior !== null);
  if (ofertas.length === 0) return null;

  // La campaña puede tener muchas ofertas, pero la composición editorial solo
  // presenta tres; el CTA lleva al catálogo filtrado para ver el conjunto completo.
  const mostradas = ofertas.slice(0, 3);
  const descuentoMaximo = Math.max(
    ...ofertas.map((producto) =>
      Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    )
  );
  const etiquetaProductos = ofertas.length === 1 ? "producto" : "productos";

  return (
    <section id="ofertas" className={styles.banda}>
      <div className={styles.texto}>
        <span className={styles.numeroDecorativo} aria-hidden="true">
          {descuentoMaximo}
        </span>
        <p className={styles.eyebrow}>Ofertas de la semana</p>
        <h2 className={styles.titulo}>
          Hasta {descuentoMaximo}% menos
          <br />
          en {ofertas.length} {etiquetaProductos}
        </h2>
        <p className={styles.bajada}>Descuentos aplicados directamente al precio.</p>
        <Link to="/#catalogo" className={styles.boton} onClick={onVerOfertas}>
          Ver ofertas
          <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </Link>
      </div>

      <div className={styles.derecha}>
        <div className={styles.ofertasInternas}>
          {/* El índice define el rol visual (izquierda, principal, derecha),
              no la prioridad comercial de cada producto. */}
          <div className={styles.minis}>
          {mostradas.map((p, i) => (
            <Link
              key={p.id}
              to={`/producto/${p.id}`}
              className={`${styles.mini} ${i === 0 ? styles.miniIzquierda : ""} ${i === 1 ? styles.miniCentral : ""} ${i === 2 ? styles.miniDerecha : ""}`}
              aria-label={`Ver ${p.nombre}`}
            >
              <div className={styles.miniImg}>
                <span className={styles.descuentoProducto}>
                  −{Math.round((1 - p.precio / p.precioAnterior) * 100)}%
                </span>
                <ImagenProducto
                  src={p.imagen}
                  alt={p.nombre}
                  className={styles.miniImagen}
                />
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.pies}>
          {mostradas.map((p) => (
            <Link key={p.id} to={`/producto/${p.id}`} className={styles.pie}>
              <p className={styles.miniNombre}>{p.nombre}</p>
              <div className={styles.miniPrecios}>
                <span className={styles.miniPrecio}>
                  ${p.precio.toLocaleString("es-CL")}
                </span>
                <span className={styles.miniPrecioAnterior}>
                  ${p.precioAnterior.toLocaleString("es-CL")}
                </span>
              </div>
            </Link>
          ))}
        </div>
        </div>
      </div>

      {/* En móvil el CTA baja después de la baraja; en escritorio permanece
          dentro del panel editorial izquierdo. */}
      <Link
        to="/#catalogo"
        className={styles.botonMovil}
        onClick={onVerOfertas}
      >
        Ver las {ofertas.length} ofertas
        <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </Link>
    </section>
  );
}

export default BandaOfertas;
