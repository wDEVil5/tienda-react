import { useEffect, useRef } from "react";
import { Login } from "../pages/Acceso.jsx";
import styles from "./ModalAcceso.module.css";

// Capa de acceso para visitantes: reutiliza el formulario y contrato de sesión
// de /login, por lo que no crea un segundo flujo de autenticación que mantener.
function ModalAcceso({ alCerrar }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogoRef.current?.querySelector("input")?.focus();

    const alTeclado = (evento) => {
      if (evento.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", alTeclado);
    };
  }, [alCerrar]);

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar();
      }}
    >
      <section
        ref={dialogoRef}
        className={styles.dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-acceso"
      >
        <header className={styles.cabecera}>
          <p className={styles.logo}>Sumarket<em>Express</em></p>
          <button className={styles.cerrar} type="button" onClick={alCerrar} aria-label="Cerrar acceso">
            ×
          </button>
        </header>
        <Login enModal alCompletar={alCerrar} />
      </section>
    </div>
  );
}

export default ModalAcceso;
