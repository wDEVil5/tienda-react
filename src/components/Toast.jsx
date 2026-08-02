import { useEffect } from "react";
import styles from "./Toast.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";

const DURACION_MS = 2600; // aviso simple
const DURACION_ACCION_MS = 5000; // con botón: más tiempo para reaccionar

function Toast({
  ubicacion = "global",
  soloAccion = false,
  ocultarSiAccion = false,
}) {
  const { aviso, descartarAviso } = useCarritoContext();
  const visible =
    Boolean(aviso) &&
    !(soloAccion && !aviso.accion) &&
    !(ocultarSiAccion && aviso.accion);

  // App y Carrito montan su propia ubicación del toast. Estas banderas hacen
  // que un mismo aviso se muestre una sola vez: las eliminaciones van al drawer.

  // Un toast con acción ("Deshacer") vive más para dar tiempo a pulsarlo.
  const duracion = aviso?.accion ? DURACION_ACCION_MS : DURACION_MS;

  // Cada aviso NUEVO (referencia distinta) arranca un temporizador que lo borra
  // solo. El cleanup limpia el timer anterior: avisos seguidos reinician la cuenta.
  useEffect(() => {
    if (!visible) return;

    const id = setTimeout(descartarAviso, duracion);
    return () => clearTimeout(id);
  }, [visible, aviso, descartarAviso, duracion]);

  // Sin aviso, no renderizamos nada.
  if (!visible) return null;

  const esAdvertencia = aviso.tipo === "advertencia";
  const icono = aviso.accion
    ? "fa-trash-can"
    : esAdvertencia
      ? "fa-circle-exclamation"
      : "fa-circle-check";

  return (
    <div
      className={`${styles.toast} ${ubicacion === "carrito" ? styles.toastCarrito : ""}`}
      role={esAdvertencia ? "alert" : "status"}
    >
      <i
        className={`fa-solid ${icono} ${styles.icono} ${
          aviso.accion
            ? styles.iconoAccion
            : esAdvertencia
              ? styles.iconoAdvertencia
              : ""
        }`}
      ></i>
      <span className={styles.texto}>{aviso.mensaje}</span>
      {aviso.accion && (
        <button
          className={styles.accion}
          onClick={() => {
            aviso.accion.alHacer();
            descartarAviso();
          }}
        >
          {aviso.accion.texto}
        </button>
      )}
    </div>
  );
}

export default Toast;
