import styles from "./Estrellas.module.css";

// Estrellas de solo lectura (display). Soporta medias estrellas para reflejar un
// promedio como 3.4. `tamano` controla el font-size en px. Es accesible: la fila
// lleva aria-label con el valor; cada estrella es decorativa.
function Estrellas({ valor = 0, tamano = 15, etiqueta }) {
  const estrellas = [1, 2, 3, 4, 5].map((posicion) => {
    if (valor >= posicion) return "llena";
    if (valor >= posicion - 0.5) return "media";
    return "vacia";
  });

  return (
    <span
      className={styles.estrellas}
      style={{ fontSize: `${tamano}px` }}
      role="img"
      aria-label={etiqueta ?? `${valor} de 5 estrellas`}
    >
      {estrellas.map((tipo, indice) => (
        <i
          key={indice}
          aria-hidden="true"
          className={
            tipo === "llena"
              ? "fa-solid fa-star"
              : tipo === "media"
                ? "fa-solid fa-star-half-stroke"
                : "fa-regular fa-star"
          }
        />
      ))}
    </span>
  );
}

export default Estrellas;
