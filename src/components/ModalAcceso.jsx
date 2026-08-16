import { useEffect, useRef, useState } from "react";
import { Login, Registro } from "../pages/Acceso.jsx";
import styles from "./ModalAcceso.module.css";

// Capa de acceso para visitantes: reutiliza el formulario y contrato de sesión
// de /login, por lo que no crea un segundo flujo de autenticación que mantener.
function ModalAcceso({ alCerrar, modoInicial = "login" }) {
  const dialogoRef = useRef(null);
  const [modo, setModo] = useState(modoInicial);

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
  }, [alCerrar, modo]);

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
          <button className={styles.cerrar} type="button" onClick={alCerrar} aria-label="Cerrar acceso">
            ×
          </button>
        </header>
        <div
          className={`${styles.pestanas} ${modo === "registro" ? styles.pestanasRegistro : ""}`}
          role="tablist"
          aria-label="Acceso a tu cuenta"
        >
          <span className={styles.indicadorPestana} aria-hidden="true" />
          <button
            id="pestana-iniciar-sesion"
            className={`${styles.pestana} ${modo === "login" ? styles.pestanaActiva : ""}`}
            type="button"
            role="tab"
            aria-selected={modo === "login"}
            aria-controls="panel-acceso"
            onClick={() => setModo("login")}
          >
            Iniciar sesión
          </button>
          <button
            id="pestana-crear-cuenta"
            className={`${styles.pestana} ${modo === "registro" ? styles.pestanaActiva : ""}`}
            type="button"
            role="tab"
            aria-selected={modo === "registro"}
            aria-controls="panel-acceso"
            onClick={() => setModo("registro")}
          >
            Crear cuenta
          </button>
        </div>
        <div
          key={modo}
          id="panel-acceso"
          className={styles.panelModo}
          role="tabpanel"
          aria-labelledby={modo === "login" ? "pestana-iniciar-sesion" : "pestana-crear-cuenta"}
        >
          {modo === "login" ? (
            <Login key="login" enModal alCompletar={alCerrar} alCambiarModo={setModo} />
          ) : (
            <Registro key="registro" enModal alCompletar={alCerrar} alCambiarModo={setModo} />
          )}
        </div>
      </section>
    </div>
  );
}

export default ModalAcceso;
