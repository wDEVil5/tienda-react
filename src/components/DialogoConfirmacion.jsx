import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./DialogoConfirmacion.module.css";

// Diálogo de confirmación propio (reemplaza window.confirm). Lo renderiza el
// ConfirmProvider; se controla con onConfirmar/onCancelar. Portal a <body> para
// quedar por encima de drawers y otros modales.
export default function DialogoConfirmacion({
  titulo,
  mensaje,
  textoConfirmar,
  textoCancelar,
  peligro,
  onConfirmar,
  onCancelar,
}) {
  const confirmarRef = useRef(null);

  useEffect(() => {
    confirmarRef.current?.focus();
    const alTecla = (evento) => {
      if (evento.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", alTecla);
    return () => document.removeEventListener("keydown", alTecla);
  }, [onCancelar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay} onClick={onCancelar}>
      <div
        className={styles.dialogo}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-confirmacion-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="dialogo-confirmacion-titulo" className={styles.titulo}>{titulo}</h2>
        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
        <div className={styles.acciones}>
          <button type="button" className={styles.cancelar} onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button
            type="button"
            ref={confirmarRef}
            className={`${styles.confirmar} ${peligro ? styles.peligro : ""}`}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
