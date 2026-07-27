import styles from "./BandaOfertas.module.css";

// Banda de ofertas del Home. Deriva las ofertas reales (las que tienen
// precioAnterior) para el conteo y las mini-tarjetas.
function BandaOfertas({ productos }) {
  const ofertas = productos.filter((p) => p.precioAnterior !== null);
  if (ofertas.length === 0) return null;

  const mostradas = ofertas.slice(0, 3);

  return (
    <section className={styles.banda}>
      <div className={styles.texto}>
        <p className={styles.eyebrow}>Ofertas de la semana</p>
        <h2 className={styles.titulo}>
          Hasta 20% en {ofertas.length} productos
        </h2>
      </div>

      <div className={styles.derecha}>
        <div className={styles.minis}>
          {mostradas.map((p, i) => (
            <div
              key={p.id}
              className={`${styles.mini} ${i === 2 ? styles.miniTercera : ""}`}
            >
              <div className={styles.miniImg} aria-hidden="true"></div>
              <p className={styles.miniNombre}>{p.nombre}</p>
              <p className={styles.miniPrecio}>
                ${p.precio.toLocaleString("es-CL")}
              </p>
            </div>
          ))}
          {/* Escritorio muestra 3 tarjetas; móvil 2 + esta pastilla "+N". */}
          {ofertas.length > 2 && (
            <div className={styles.masTile}>+{ofertas.length - 2}</div>
          )}
        </div>

        <a href="#catalogo" className={styles.boton}>
          Ver ofertas
        </a>
      </div>
    </section>
  );
}

export default BandaOfertas;
