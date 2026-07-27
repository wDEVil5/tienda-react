import styles from "./Hero.module.css";

// Sección héroe del Home. La imagen de fondo es un placeholder a rayas (aún no
// hay foto real; el handoff pide 1 foto de héroe 1280×520 con tratamiento cálido).
function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Minimarket del barrio</p>
        <h1 className={styles.titulo}>
          Tu despensa,
          <br />
          lista <em>esta tarde</em>
        </h1>
        <p className={styles.parrafo}>
          200 productos con precio real y stock al día.
        </p>
        <div className={styles.acciones}>
          <a href="#catalogo" className={styles.btnPrimario}>
            Ver el catálogo
          </a>
          <a href="#catalogo" className={styles.btnSecundario}>
            Ofertas de la semana
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
