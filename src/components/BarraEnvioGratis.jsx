import styles from "./BarraEnvioGratis.module.css";

const clp = (n) => `$${(n ?? 0).toLocaleString("es-CL")}`;

// Barra de progreso "te faltan $X para envío gratis". El subtotal debe venir a
// precio normal (antes de descuento), igual que la regla del backend, para no
// prometer envío gratis que el servidor luego cobra. Sirve en el carrito
// (variante "banda", de borde a borde) y en el checkout (variante "caja").
function BarraEnvioGratis({ subtotal, umbral, variante = "banda", className = "" }) {
  if (!umbral || umbral <= 0) return null;

  const faltante = Math.max(0, umbral - subtotal);
  const porcentaje = Math.min(100, Math.round((subtotal / umbral) * 100));
  const logrado = faltante === 0;

  return (
    <div className={`${styles.barra} ${styles[variante] ?? ""} ${className}`}>
      <span className={styles.texto}>
        {logrado ? (
          <>
            <i className="fa-solid fa-truck-fast" aria-hidden="true" /> ¡Tienes{" "}
            <strong>envío gratis</strong>!
          </>
        ) : (
          <>
            Te faltan <strong>{clp(faltante)}</strong> para envío gratis
          </>
        )}
      </span>
      <div
        className={styles.pista}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={umbral}
        aria-valuenow={Math.min(subtotal, umbral)}
        aria-label="Progreso hacia el envío gratis"
      >
        {/* El ancho es un dato calculado en runtime, no estilo estático: va como
            variable CSS y el módulo la consume en .relleno. */}
        <div className={styles.relleno} style={{ "--progreso": `${porcentaje}%` }} />
      </div>
    </div>
  );
}

export default BarraEnvioGratis;
