import styles from "./MarcasGondola.module.css";

// "Marcas en góndola": marquee de dos filas que se deslizan en sentidos
// opuestos. Son PLACEHOLDERS "[ logo NN ]" a propósito: . Cuando la
// tienda tenga permisos, se reemplaza el texto por <img> dentro del mismo tile.
//
// Doce espacios temporales, seis por fila. Cada pista duplica su propio set
// para que el carrusel pueda desplazarse en bucle sin un salto visible.
const LOGOS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

function Pista({ logos, direccion }) {
  const claseFila = direccion === "izquierda" ? styles.filaIzq : styles.filaDer;
  return (
    <div className={`${styles.fila} ${claseFila}`}>
      {/* Set duplicado: [...logos, ...logos]. Las keys llevan un sufijo para
          distinguir el original de la copia. */}
      <div className={styles.track}>
        {[...logos, ...logos].map((n, i) => (
          <div key={`${n}-${i}`} className={styles.tile}>
            [ logo {n} ]
          </div>
        ))}
      </div>
    </div>
  );
}

function MarcasGondola() {
  const filaArriba = LOGOS.slice(0, 7);
  const filaAbajo = LOGOS.slice(7);

  return (
    <section className={styles.marcas}>
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

      {/* Decorativo: el lector de pantalla no necesita leer 28 placeholders. */}
      <div className={styles.pistas} aria-hidden="true">
        <Pista logos={filaArriba} direccion="izquierda" />
        <Pista logos={filaAbajo} direccion="derecha" />
      </div>
    </section>
  );
}

export default MarcasGondola;
