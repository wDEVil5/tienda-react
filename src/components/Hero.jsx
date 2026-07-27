import { Link } from "react-router-dom";
import styles from "./Hero.module.css";

// Sección héroe del Home. La imagen de fondo es un placeholder a rayas (aún no
// hay foto real; el handoff pide 1 foto de héroe 1280×520 con tratamiento cálido).
function Hero({ productos }) {
  const accesos = [...new Set(productos.map((producto) => producto.categoria))].slice(0, 4);
  const catalogo = { pathname: "/", hash: "#catalogo" };
  const enlaceCategoria = (categoria) => ({
    pathname: "/",
    search: `?categoria=${encodeURIComponent(categoria)}`,
    hash: "#catalogo",
  });

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
          <Link to={catalogo} className={styles.btnPrimario}>
            Ver el catálogo
          </Link>
          <Link
            to={{ pathname: "/", search: "?ofertas=1", hash: "#catalogo" }}
            className={styles.btnSecundario}
          >
            Ofertas de la semana
          </Link>
        </div>
        <div className={styles.accesos} aria-label="Categorías destacadas">
          {accesos.map((acceso) => (
            <Link key={acceso} to={enlaceCategoria(acceso)} className={styles.acceso}>
              {acceso}
            </Link>
          ))}
          <Link
            to={{ pathname: "/", search: "?ofertas=1", hash: "#catalogo" }}
            className={`${styles.acceso} ${styles.accesoOferta}`}
          >
            Ofertas −20%
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Hero;
