import { useCallback, useEffect, useRef, useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";
import styles from "./CarruselProductos.module.css";

// Fila horizontal de productos (patrón "Lo más vendido" de un súper): reusa las
// TarjetaProducto en una pista con scroll y flechas de avance. `accion` es un
// nodo opcional a la derecha del título (p. ej. un enlace "Ver todo").
//
// `encajado` lo adapta a un contenedor angosto (p. ej. una columna de la ficha):
// quita el ancho máximo, el centrado y el padding lateral de página, para que las
// tarjetas queden a ras del contenido que lo rodea.
function CarruselProductos({ titulo, eyebrow, productos, accion, encajado = false }) {
  const pistaRef = useRef(null);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(false);

  // Recalcula si las flechas deben deshabilitarse según la posición del scroll.
  // Se llama desde onScroll (evento) y desde un rAF al montar/cambiar productos,
  // nunca en el cuerpo del efecto (evita setState directo en efecto).
  const actualizarFlechas = useCallback(() => {
    const el = pistaRef.current;
    if (!el) return;
    const margen = 4; // tolerancia por subpíxeles
    setAlInicio(el.scrollLeft <= margen);
    setAlFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - margen);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(actualizarFlechas);
    window.addEventListener("resize", actualizarFlechas);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", actualizarFlechas);
    };
  }, [actualizarFlechas, productos]);

  const desplazar = (direccion) => {
    const el = pistaRef.current;
    if (!el) return;
    // Avanza ~80% del ancho visible (varias tarjetas), sin pasarse de una pantalla.
    el.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!productos?.length) return null;

  return (
    <section className={`${styles.seccion} ${encajado ? styles.encajado : ""}`}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h2 className={styles.titulo}>{titulo}</h2>
          </div>
          {accion && <div className={styles.accion}>{accion}</div>}
        </header>
      </div>

      <div className={styles.marco}>
        <button
          type="button"
          className={`${styles.flecha} ${styles.flechaIzq}`}
          onClick={() => desplazar(-1)}
          disabled={alInicio}
          aria-label="Ver productos anteriores"
        >
          <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>

        <ul className={styles.pista} ref={pistaRef} onScroll={actualizarFlechas}>
          {productos.map((producto) => (
            <li className={styles.slot} key={producto.id}>
              <TarjetaProducto producto={producto} />
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={`${styles.flecha} ${styles.flechaDer}`}
          onClick={() => desplazar(1)}
          disabled={alFinal}
          aria-label="Ver más productos"
        >
          <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </section>
  );
}

export default CarruselProductos;
