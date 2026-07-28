import styles from "./Hero.module.css";
import { Link } from "react-router-dom";

// Sección héroe del Home. La imagen de fondo es un placeholder a rayas (aún no
// hay foto real; el handoff pide 1 foto de héroe 1280×520 con tratamiento cálido).
function Hero({ productos, onVerOfertas, onVerCatalogo }) {
  const accesos = [...new Set(productos.map((producto) => producto.categoria))].slice(0, 4);

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Minimarket del barrio desde 2014</p>
        <h1 className={styles.titulo}>
          Tu despensa,
          <br />
          lista <em>esta tarde</em>
        </h1>
        <p className={styles.parrafo}>
          Más de 200 productos del barrio con precio real y stock al día.
          <br />
          Retira hoy o recíbelo mañana.
        </p>
        <div className={styles.acciones}>
          <Link to="/#catalogo" className={styles.btnPrimario} onClick={onVerCatalogo}>
            Ver el catálogo
          </Link>
          <Link to="/#catalogo" className={styles.btnSecundario} onClick={onVerOfertas}>
            Ofertas de la semana
          </Link>
        </div>
        <div className={styles.accesos} aria-label="Categorías destacadas">
          {accesos.map((acceso) => (
            <span key={acceso} className={styles.acceso}>
              {acceso}
            </span>
          ))}
          <span className={`${styles.acceso} ${styles.accesoOferta}`}>
            Ofertas −20%
          </span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
