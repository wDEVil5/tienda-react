import { useState } from "react";
import styles from "./ImagenProducto.module.css";

// Imagen con red de seguridad: si la URL externa falla (servidor caído, imagen
// borrada, sin conexión), en vez del ícono roto del navegador mostramos un
// placeholder diferente al del navegador por default. Cada imagen recuerda SU propio estado de error. gg, es opcional pero queda bonito
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
