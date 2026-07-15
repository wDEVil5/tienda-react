import styles from "./Carrito.module.css";

function Carrito({ carrito, onEliminar, onCambiarCantidad }) {
  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0
  );

  if (carrito.length === 0) {
    return (
      <aside className={styles.carrito}>
        <h2 className={styles.titulo}>Tu carrito</h2>
        <p className={styles.vacio}>Tu carrito está vacío.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.carrito}>
      <h2 className={styles.titulo}>Tu carrito</h2>

      {carrito.map((item) => (
        <div key={item.id} className={styles.item}>
          <span className={styles.itemNombre}>{item.nombre}</span>
          <div className={styles.itemControles}>
            <div className={styles.cantidad}>
              <button
                className={styles.botonCantidad}
                onClick={() => onCambiarCantidad(item.id, -1)}
              >
                −
              </button>
              <span>{item.cantidad}</span>
              <button
                className={styles.botonCantidad}
                onClick={() => onCambiarCantidad(item.id, 1)}
              >
                +
              </button>
            </div>
            <span className={styles.subtotal}>
              ${(item.precio * item.cantidad).toLocaleString("es-CL")}
            </span>
          </div>
          <button
            className={styles.eliminar}
            onClick={() => onEliminar(item.id)}
          >
            Eliminar
          </button>
        </div>
      ))}

      <div className={styles.total}>
        <span>Total</span>
        <span className={styles.totalMonto}>
          ${total.toLocaleString("es-CL")}
        </span>
      </div>
    </aside>
  );
}

export default Carrito;