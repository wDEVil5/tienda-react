import { useEffect, useState } from "react";

const prefiereMenosMovimiento = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Cuenta desde 0 hasta `objetivo` cuando `activo` pasa a true (p. ej. al entrar
// la sección en pantalla). Respeta prefers-reduced-motion (salta al valor final).
// `tabular-nums` en el estilo del número evita que el ancho salte al contar.
export default function Contador({ objetivo, activo, duracion = 900, retardo = 0, className }) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!activo) return undefined;

    // Sin animación: saltamos al final (en rAF para no hacer setState sincrónico).
    if (prefiereMenosMovimiento()) {
      const id = requestAnimationFrame(() => setValor(objetivo));
      return () => cancelAnimationFrame(id);
    }

    let raf;
    let temporizador;
    let inicio = null;
    const paso = (t) => {
      if (inicio === null) inicio = t;
      const progreso = Math.min(1, (t - inicio) / duracion);
      const suave = 1 - Math.pow(1 - progreso, 3); // easeOutCubic
      setValor(Math.round(objetivo * suave));
      if (progreso < 1) raf = requestAnimationFrame(paso);
    };
    temporizador = window.setTimeout(() => {
      raf = requestAnimationFrame(paso);
    }, retardo);

    return () => {
      window.clearTimeout(temporizador);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activo, objetivo, duracion, retardo]);

  return <span className={className}>{valor}</span>;
}
