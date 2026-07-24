import { useEffect } from "react";
import styles from "./Carrito.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";

function Carrito({ onCerrar, abierto }) {
  const { carrito, eliminarDelCarrito, cambiarCantidad } = useCarritoContext();

  // Efecto: solo cuando el carrito está ABIERTO, escuchamos la tecla Escape
  // (evento del navegador → vive fuera de React) y congelamos el scroll del
  // fondo para que no se mueva la página detrás del drawer.
  useEffect(() => {
    if (!abierto) return;

    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";

    // Cleanup: React lo ejecuta al cerrar el carrito o al desmontar. Si abrimos
    // algo (un listener, un estilo), lo cerramos aquí. Sin esto quedarían
    // listeners zombis y el scroll bloqueado para siempre.
    return () => {
      window.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = "";
    };
  }, [abierto, onCerrar]);

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
              <div className={styles.imagenWrap}>
                <img
                  className={styles.imagen}
                  src={item.imagen}
                  alt={item.nombre}
                />
              </div>

              <div className={styles.info}>
                <div className={styles.filaSuperior}>
                  <span className={styles.itemNombre}>{item.nombre}</span>
                  {/* Boton eliminar */}
                  <button
                    className={styles.eliminar}
                    onClick={() => eliminarDelCarrito(item.id)}
                    aria-label="Eliminar producto"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>

                <div className={styles.filaInferior}>
                  <div className={styles.cantidad}>
                    <button
                      className={styles.botonCantidad}
                      onClick={() => cambiarCantidad(item.id, -1)}
                    >
                      −
                    </button>
                    <span className={styles.numeroCantidad}>
                      {item.cantidad}
                    </span>
                    <button
                      className={styles.botonCantidad}
                      onClick={() => cambiarCantidad(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className={styles.subtotal}>
                    ${(item.precio * item.cantidad).toLocaleString("es-CL")}
                  </span>
                </div>
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