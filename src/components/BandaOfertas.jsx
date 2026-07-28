import styles from "./BandaOfertas.module.css";
import ImagenProducto from "./ImagenProducto.jsx";
import { Link } from "react-router-dom";

// Banda de ofertas del Home. Deriva las ofertas reales (las que tienen
// precioAnterior) para el conteo y las mini-tarjetas.
function BandaOfertas({ productos, onVerOfertas }) {
  const ofertas = productos.filter((p) => p.precioAnterior !== null);
  if (ofertas.length === 0) return null;

  const mostradas = ofertas.slice(0, 3);
  const descuentoMaximo = Math.max(
    ...ofertas.map((producto) =>
      Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    )
  );

  return (
    <section id="ofertas" className={styles.banda}>
      <div className={styles.texto}>
        <p className={styles.eyebrow}>Ofertas de la semana</p>
        <h2 className={styles.titulo}>
          Hasta {descuentoMaximo}% en {ofertas.length} productos
        </h2>
      </div>

      <div className={styles.derecha}>
        <div className={styles.minis}>
          {mostradas.map((p, i) => (
            <Link
              key={p.id}
              to={`/producto/${p.id}`}
              className={`${styles.mini} ${i === 2 ? styles.miniTercera : ""}`}
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
              <p className={styles.miniNombre}>{p.nombre}</p>
              <div className={styles.miniPrecios}>
                <span className={styles.miniPrecioAnterior}>
                  ${p.precioAnterior.toLocaleString("es-CL")}
                </span>
                <span className={styles.miniPrecio}>
                  ${p.precio.toLocaleString("es-CL")}
                </span>
              </div>
            </Link>
          ))}
          {/* Escritorio muestra 3 tarjetas; móvil 2 + esta pastilla "+N". */}
          {ofertas.length > 2 && (
            <div className={styles.masTile}>+{ofertas.length - 2}</div>
          )}
        </div>

        <Link to="/#catalogo" className={styles.boton} onClick={onVerOfertas}>
          Ver ofertas
          <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </Link>
      </div>
    </section>
  );
}

export default BandaOfertas;
