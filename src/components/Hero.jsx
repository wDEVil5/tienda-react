import { Link } from "react-router-dom";
import styles from "./Hero.module.css";
import { useReglas } from "../context/ReglasContext.jsx";

// Sección héroe del Home (fallback del banner): accesos por categoría, CTA y la
// línea de estado de la tienda. Todo enlaza a las páginas de listado.
function Hero({ productos }) {
  const { corteRetiroHoy } = useReglas();

  // Accesos rápidos: primeras 3 categorías del catálogo (con su slug para el
  // enlace) + chip de ofertas.
  const accesos = [...new Set(productos.map((p) => p.categoria))]
    .slice(0, 3)
    .map((nombre) => ({
      nombre,
      slug: productos.find((p) => p.categoria === nombre)?.categoriaSlug ?? nombre,
    }));

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
          Retira hoy o recíbelo mañana.
        </p>

        {/* Accesos rápidos por categoría; el chip de ofertas va diferenciado. */}
        <div className={styles.accesos} aria-label="Categorías destacadas">
          {accesos.map((acceso) => (
            <Link key={acceso.nombre} className={styles.acceso} to={`/categoria/${acceso.slug}`}>
              {acceso.nombre}
            </Link>
          ))}
          <Link className={`${styles.acceso} ${styles.accesoOferta}`} to="/ofertas">
            Ofertas −20%
          </Link>
        </div>

        {/* Un único CTA sólido + el secundario como enlace subrayado. */}
        <div className={styles.acciones}>
          <Link to="/catalogo" className={styles.btnPrimario}>
            Ver el catálogo
          </Link>
          <Link to="/ofertas" className={styles.btnSecundario}>
            Ofertas de la semana
          </Link>
        </div>

        {/* Estado de la tienda + corte horario (de las reglas) + ver horarios. */}
        <div className={styles.estado}>
          <span className={styles.punto} aria-hidden="true" />
          <span className={styles.estadoTexto}>
            <strong>Tienda abierta</strong> · pedidos hasta las {corteRetiroHoy} se retiran hoy
          </span>
          <span className={styles.estadoSep} aria-hidden="true">·</span>
          <button type="button" className={styles.verHorarios}>ver horarios</button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
