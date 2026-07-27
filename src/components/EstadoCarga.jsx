import styles from "./EstadoCarga.module.css";

const TARJETAS_ESQUELETO = 5;

// Estado transitorio mientras llega el catálogo. Las piezas replican la forma de
// una TarjetaProducto para que el layout no cambie bruscamente al resolver fetch.
function EstadoCarga() {
  return (
    <section className={styles.carga} role="status" aria-live="polite">
      <p className={styles.eyebrow}>Cargando catálogo</p>
      <div className={styles.grid} aria-hidden="true">
        {Array.from({ length: TARJETAS_ESQUELETO }, (_, indice) => (
          <div className={styles.tarjeta} key={indice}>
            <span className={styles.imagen}></span>
            <span className={styles.linea}></span>
            <span className={`${styles.linea} ${styles.lineaCorta}`}></span>
          </div>
        ))}
      </div>
      <p className={styles.mensaje}>Estamos preparando los productos para ti.</p>
    </section>
  );
}

export default EstadoCarga;
