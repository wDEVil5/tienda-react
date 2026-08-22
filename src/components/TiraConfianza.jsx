import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./TiraConfianza.module.css";
import Contador from "./Contador.jsx";
import { useReglas } from "../context/ReglasContext.jsx";

// Franja de garantías: cuatro cifras verificables del negocio, sin contenedor
// (solo una línea fina). La etiqueta "rueda" en hover para revelar la nota. El
// costo/umbral de despacho salen de las reglas de la tienda (no hardcodeados).
// Las cifras hacen un "count-up" cuando la sección entra en pantalla.
function TiraConfianza() {
  const { tarifaBase, envioGratisDesde } = useReglas();

  // Dispara el conteo la primera vez que la franja se ve al hacer scroll.
  const seccionRef = useRef(null);
  const [enVista, setEnVista] = useState(false);
  useEffect(() => {
    const el = seccionRef.current;
    if (!el || enVista) return undefined;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0].isIntersecting) {
          setEnVista(true);
          observador.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [enVista]);
  const clp = (n) => `$\u202f${(n ?? 0).toLocaleString("es-CL")}`;
  const notaDespacho = envioGratisDesde
    ? `${clp(tarifaBase)} · gratis sobre ${clp(envioGratisDesde)}`
    : clp(tarifaBase);

  const items = [
    { numero: "2", unidad: "horas", etiqueta: "Retiro en tienda", nota: "Gratis, te avisamos", enlace: "Ver cómo", href: "/como-comprar" },
    { numero: "48", unidad: "horas", etiqueta: "Despacho a domicilio", nota: notaDespacho, enlace: "Cobertura", href: "/como-comprar" },
    { numero: "4", unidad: "medios de pago", etiqueta: "Pago seguro en línea", nota: "Débito, crédito, transferencia o efectivo", enlace: "Medios de pago", href: "/como-comprar" },
    { numero: "10", unidad: "días", etiqueta: "Cambios y devoluciones", nota: "Con boleta, en la tienda", enlace: "Condiciones", href: "/terminos" },
  ];

  return (
    <section ref={seccionRef} className={styles.seccion} aria-label="Por qué comprar con nosotros">
      <div className={styles.inner}>
        <span className={styles.linea} aria-hidden="true" />
        <div className={styles.grid}>
          {items.map((item, i) => (
            <div key={item.etiqueta} className={styles.columna}>
              <p className={styles.cifra}>
                <Contador
                  className={styles.numero}
                  objetivo={Number(item.numero)}
                  activo={enVista}
                  retardo={i * 120}
                />
                <span className={styles.unidad}>{item.unidad}</span>
              </p>
              {/* Caja de altura fija: el "roll" cae exacto 44px aunque la nota sean dos líneas. */}
              <div className={styles.rollbox}>
                <div className={styles.roll}>
                  <span className={styles.rollEtiqueta}>{item.etiqueta}</span>
                  <span className={styles.rollNota}>{item.nota}</span>
                </div>
              </div>
              <Link to={item.href} className={styles.enlace}>{item.enlace} →</Link>
              {/* Nota fija para táctil (hover: none); oculta en escritorio. */}
              <p className={styles.notaMovil}>{item.nota}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TiraConfianza;
