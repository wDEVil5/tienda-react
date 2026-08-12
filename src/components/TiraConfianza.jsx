import styles from "./TiraConfianza.module.css";
import { useReglas } from "../context/ReglasContext.jsx";

// Franja de confianza: 4 argumentos de venta. Cada celda tiene un rótulo (mono)
// arriba, el dato protagonista (serif grande) al centro y una explicación real
// abajo. Escritorio 4×1, móvil 2×2. El costo de despacho sale de las reglas de
// la tienda (editable en /admin/envios), no hardcodeado.
function TiraConfianza() {
  const { tarifaBase } = useReglas();
  const despacho = `$\u202F${(tarifaBase ?? 0).toLocaleString("es-CL")}`;

  const items = [
    { rotulo: "Retiro hoy", dato: "2 horas", detalle: "Listo para retirar en tienda" },
    { rotulo: "Despacho", dato: despacho, detalle: "Llega en 24–48 h a tu casa" },
    { rotulo: "Pago seguro", dato: "Mercado Pago", detalle: "Tarjeta, débito o transferencia" },
    { rotulo: "Stock real", dato: "Al día", detalle: "Directo desde la tienda" },
  ];

  return (
    <section className={styles.tira} aria-label="Por qué comprar con nosotros">
      {items.map((item) => (
        <div key={item.rotulo} className={styles.celda}>
          <p className={styles.rotulo}>{item.rotulo}</p>
          <p className={styles.dato}>{item.dato}</p>
          <p className={styles.detalle}>{item.detalle}</p>
        </div>
      ))}
    </section>
  );
}

export default TiraConfianza;
