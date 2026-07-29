import { useState } from "react";
import styles from "./ImagenProducto.module.css";

// Centraliza el fallback de imágenes externas: la UI no muestra el ícono roto
// nativo si una URL falla o aún no existe en el catálogo.
function ImagenProducto({ src, alt, className }) {
  const [falló, setFalló] = useState(false);

  // Sin src, o si la carga disparó onError, mostramos el placeholder.
  if (falló || !src) {
    return (
      <div className={styles.placeholder} role="img" aria-label={alt}>
        <i className="fa-solid fa-image" aria-hidden="true"></i>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      // onError se dispara si el navegador no pudo cargar la imagen.
      onError={() => setFalló(true)}
    />
  );
}

export default ImagenProducto;
