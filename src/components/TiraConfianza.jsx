import styles from "./TiraConfianza.module.css";

// Tira de confianza: 4 argumentos de venta. Escritorio 4×1, móvil 2×2.
const ITEMS = [
  { titulo: "Retiro hoy", detalle: "Listo en 2 horas" },
  { titulo: "Despacho", detalle: "$2.990 · 24-48h" },
  { titulo: "Pago seguro", detalle: "Mercado Pago" },
  { titulo: "Stock real", detalle: "Desde la tienda" },
];

function TiraConfianza() {
  return (
    <section className={styles.tira}>
      {ITEMS.map((item) => (
        <div key={item.titulo} className={styles.celda}>
          <p className={styles.titulo}>{item.titulo}</p>
          <p className={styles.detalle}>{item.detalle}</p>
        </div>
      ))}
    </section>
  );
}

export default TiraConfianza;
