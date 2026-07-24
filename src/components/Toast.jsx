import { useEffect } from "react";
import styles from "./Toast.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";

const DURACION_MS = 2600;

function Toast() {
  const { aviso, descartarAviso } = useCarritoContext();

  // Cada vez que hay un aviso NUEVO (objeto con referencia distinta), arrancamos
  // un temporizador que lo borra solo. El cleanup limpia el timer anterior: si
  // el usuario agrega rápido dos veces, el contador se REINICIA en vez de apilarse.
  useEffect(() => {
    if (!aviso) return;

    const id = setTimeout(descartarAviso, DURACION_MS);
    return () => clearTimeout(id);
  }, [aviso, descartarAviso]);

  // Sin aviso, no renderizamos nada.
  if (!aviso) return null;

  return (
    <div className={styles.toast} role="status">
      <i className={`fa-solid fa-circle-check ${styles.icono}`}></i>
      <span className={styles.texto}>
        <strong>{aviso.nombre}</strong> se agregó al carrito
      </span>
    </div>
  );
}

export default Toast;
