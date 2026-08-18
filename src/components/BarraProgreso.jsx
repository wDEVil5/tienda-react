import { useEffect, useState } from "react";
import styles from "./BarraProgreso.module.css";

// Franja de progreso indeterminado. No conoce el porcentaje real (el navegador
// no lo expone en fetch), así que "gotea" acercándose al 90% mientras hay carga
// y salta al 100% al terminar, imitando el patrón de NProgress/Jumbo.
export default function BarraProgreso({ activa }) {
  const [progreso, setProgreso] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activa) {
      let cancelado = false;
      // El arranque va en rAF para no hacer setState sincrónico en el efecto.
      const arranque = requestAnimationFrame(() => {
        if (cancelado) return;
        setVisible(true);
        setProgreso(10);
      });
      // Avance asintótico: cada paso cubre una fracción de lo que falta al 90%,
      // así nunca lo alcanza hasta que la carga realmente termina.
      const goteo = setInterval(() => {
        setProgreso((p) => (p >= 90 ? p : p + (90 - p) * 0.12));
      }, 220);
      return () => {
        cancelado = true;
        cancelAnimationFrame(arranque);
        clearInterval(goteo);
      };
    }

    // Al terminar: completar al 100% y desvanecer. Si nunca se mostró, no hace
    // nada visible (queda oculta con progreso 0).
    let cancelado = false;
    const completar = requestAnimationFrame(() => {
      if (!cancelado) setProgreso(100);
    });
    const ocultar = setTimeout(() => {
      if (cancelado) return;
      setVisible(false);
      setProgreso(0);
    }, 360);
    return () => {
      cancelado = true;
      cancelAnimationFrame(completar);
      clearTimeout(ocultar);
    };
  }, [activa]);

  if (!visible) return null;

  return (
    <div className={styles.pista} aria-hidden="true">
      <div
        className={styles.barra}
        // Ancho y opacidad son dinámicos (dependen del estado), por eso van en
        // línea; el resto del estilo vive en el módulo CSS.
        style={{ width: `${progreso}%`, opacity: progreso >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
