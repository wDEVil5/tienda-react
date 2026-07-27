import styles from "./BandaOfertas.module.css";
import ImagenProducto from "./ImagenProducto.jsx";

// Banda de ofertas del Home. Deriva las ofertas reales (las que tienen
// precioAnterior) para el conteo y las mini-tarjetas.
function BandaOfertas({ productos }) {
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
            <div
              key={p.id}
              className={`${styles.mini} ${i === 2 ? styles.miniTercera : ""}`}
            >
              <div className={styles.miniImg}>
                <ImagenProducto
                  src={p.imagen}
                  alt={p.nombre}
                  className={styles.miniImagen}
                />
              </div>
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
