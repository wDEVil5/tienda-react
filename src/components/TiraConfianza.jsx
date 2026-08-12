import styles from "./TiraConfianza.module.css";
import { Fragment } from "react";
import { useReglas } from "../context/ReglasContext.jsx";

// Franja de confianza: 4 argumentos de venta en una línea cada uno (título en
// negrita seguido de detalles separados por "·"). El costo de despacho sale de
// las reglas de la tienda (editable en /admin/envios), no hardcodeado.
function TiraConfianza() {
  const { tarifaBase } = useReglas();
  const despacho = `$\u202F${(tarifaBase ?? 0).toLocaleString("es-CL")}`;

  const items = [
    { titulo: "Retiro hoy", detalles: ["listo en 2 horas", "gratis en tienda"] },
    { titulo: "Despacho", detalles: [despacho, "24–48h"] },
    { titulo: "Pago seguro", detalles: ["Mercado Pago"] },
    { titulo: "Stock real", detalles: ["desde la tienda"] },
  ];

  return (
    <section className={styles.tira} aria-label="Por qué comprar con nosotros">
      {items.map((item) => (
        <p key={item.titulo} className={styles.celda}>
          <strong className={styles.titulo}>{item.titulo}</strong>
          {item.detalles.map((detalle) => (
            <Fragment key={detalle}>
              <span className={styles.sep} aria-hidden="true"> · </span>
              <span className={styles.detalle}>{detalle}</span>
            </Fragment>
          ))}
        </p>
      ))}
    </section>
  );
}

export default TiraConfianza;
