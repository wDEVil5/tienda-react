import styles from "./MarcasGondola.module.css";
import { marcasActivas } from "../data/marcas.js";

function Pista({ marcas, direccion }) {
  const claseFila = direccion === "izquierda" ? styles.filaIzq : styles.filaDer;
  return (
    <div className={`${styles.fila} ${claseFila}`}>
      {/* Set duplicado: [...marcas, ...marcas]. Las keys llevan un sufijo para
          distinguir el original de la copia. */}
      <div className={styles.track}>
        {[...marcas, ...marcas].map((marca, i) => (
          <div
            key={`${marca.id}-${i}`}
            className={`${styles.tile} ${marca.logoUrl ? styles.tileConLogo : ""}`}
          >
            {marca.logoUrl ? (
              <img className={styles.logo} src={marca.logoUrl} alt="" />
            ) : (
              <span>[ logo {String(marca.id).padStart(2, "0")} ]</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MarcasGondola({ marcas = marcasActivas }) {
  const filaArriba = marcas.slice(0, 7);
  const filaAbajo = marcas.slice(7);

  return (
    <section id="nuestra-tienda" className={styles.marcas}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Marcas en góndola</p>
            <h2 className={styles.titulo}>Trabajamos con las marcas de siempre</h2>
          </div>
          <p className={styles.nota}>
            Las marcas que conoces, al precio de siempre.
          </p>
        </div>
      </div>

      {/* Decorativo: el lector de pantalla no necesita leer los logos repetidos. */}
      <div className={styles.pistas} aria-hidden="true">
        <Pista marcas={filaArriba} direccion="izquierda" />
        <Pista marcas={filaAbajo} direccion="derecha" />
      </div>
    </section>
  );
}

export default MarcasGondola;
