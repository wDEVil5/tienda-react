import styles from "./Carrito.module.css";

function Carrito({
  carrito,
  onEliminar,
  onCambiarCantidad,
  onCerrar,
  abierto,
}) {
  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0,
  );

  return (
    <aside className={`${styles.carrito} ${abierto ? styles.abierto : ""}`}>
      {/* Zona 1: cabecera */}
      <div className={styles.cabecera}>
        <h2 className={styles.titulo}>Tu carrito</h2>
        <button className={styles.cerrar} onClick={onCerrar}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Zona 2: lista scrolleable */}
      <div className={styles.lista}>
        {carrito.length === 0 ? (
          <p className={styles.vacio}>Tu carrito está vacío.</p>
        ) : (
          carrito.map((item) => (
            <div key={item.id} className={styles.item}>
              <img
                className={styles.imagen}
                src={item.imagen}
                alt=""
              />
              <div className={styles.itemInfo}>
                <span className={styles.itemNombre}>{item.nombre}</span>
                <div className={styles.cantidad}>
                  <button
                    className={styles.botonCantidad}
                    onClick={() => onCambiarCantidad(item.id, -1)}
                    aria-label={`Restar una unidad de ${item.nombre}`}
                  >
                    −
                  </button>
                  <span>{item.cantidad}</span>
                  <button
                    className={styles.botonCantidad}
                    onClick={() => onCambiarCantidad(item.id, 1)}
                    aria-label={`Sumar una unidad de ${item.nombre}`}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className={styles.itemAcciones}>
                <button
                  className={styles.eliminar}
                  onClick={() => onEliminar(item.id)}
                  aria-label={`Eliminar ${item.nombre} del carrito`}
                  title="Eliminar del carrito"
                >
                  <i className="fa-regular fa-trash-can"></i>
                </button>
                <span className={styles.subtotal}>
                  ${(item.precio * item.cantidad).toLocaleString("es-CL")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Zona 3: total fijo (solo si hay items) */}
      {carrito.length > 0 && (
        <div className={styles.pie}>
          <div className={styles.total}>
            <span>Total</span>
            <span className={styles.totalMonto}>
              ${total.toLocaleString("es-CL")}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Carrito;
