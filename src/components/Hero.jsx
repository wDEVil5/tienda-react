import { Link, useNavigate } from "react-router-dom";
import styles from "./Hero.module.css";
import { useReglas } from "../context/ReglasContext.jsx";

// Sección héroe del Home: fondo neblina claro a todo el ancho, contenido
// centrado. El buscador vive en el header (siempre visible); aquí quedan los
// accesos por categoría, los CTA y la línea de estado de la tienda.
function Hero({
  productos,
  onBuscar,
  onSeleccionarCategoria,
  onCambiarSoloOfertas,
  onVerOfertas,
  onVerCatalogo,
}) {
  const { corteRetiroHoy } = useReglas();
  const navegar = useNavigate();

  // Accesos rápidos: primeras 3 categorías del catálogo + chip de ofertas.
  const accesos = [...new Set(productos.map((p) => p.categoria))].slice(0, 3);

  const seleccionarCategoria = (categoria) => {
    onBuscar("");
    onSeleccionarCategoria(categoria);
    onCambiarSoloOfertas(false);
    navegar("/#catalogo");
  };

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
            <button
              key={acceso}
              type="button"
              className={styles.acceso}
              onClick={() => seleccionarCategoria(acceso)}
            >
              {acceso}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.acceso} ${styles.accesoOferta}`}
            onClick={() => {
              onVerOfertas();
              navegar("/#catalogo");
            }}
          >
            Ofertas −20%
          </button>
        </div>

        {/* Un único CTA sólido + el secundario como enlace subrayado. */}
        <div className={styles.acciones}>
          <Link to="/#catalogo" className={styles.btnPrimario} onClick={onVerCatalogo}>
            Ver el catálogo
          </Link>
          <Link to="/#catalogo" className={styles.btnSecundario} onClick={onVerOfertas}>
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
