import { useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./Carrito.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";

function Carrito({ onCerrar, abierto }) {
  const { carrito, totalItems, eliminarDelCarrito, cambiarCantidad, vaciarCarrito } =
    useCarritoContext();

  // solo cuando el carrito está ABIERTO, escuchamos la tecla Escape
  // (evento del navegador -> vive fuera de React) y congelamos el scroll del
  // fondo para que no se mueva la página detrás del drawer.
  useEffect(() => {
    if (!abierto) return;

    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";

    // Cleanup: React lo ejecuta al cerrar el carrito o al desmontar. Si abrimos
    // otra cosa (un listener, un estilo), lo cerramos aquí mismo. Sin esto quedarían
    // listeners zombis y el scroll se bloquearia.
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
        <h2 className={styles.titulo}>
          Tu carrito{totalItems > 0 && ` (${totalItems})`}
        </h2>
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
                <Link to={`/producto/${item.id}`} onClick={onCerrar}>
                  <img
                    className={styles.imagen}
                    src={item.imagen}
                    alt={item.nombre}
                  />
                </Link>
              </div>

              <div className={styles.info}>
                <div className={styles.filaSuperior}>
                  <Link
                    to={`/producto/${item.id}`}
                    onClick={onCerrar}
                    className={styles.itemNombre}
                  >
                    {item.nombre}
                  </Link>
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

      {/* Zona 3: total + acciones fijo (solo si hay items) */}
      {carrito.length > 0 && (
        <div className={styles.pie}>
          <div className={styles.total}>
            <span>Total</span>
            <span className={styles.totalMonto}>
              ${total.toLocaleString("es-CL")}
            </span>
          </div>

          <div className={styles.acciones}>
            {/* esa es una acción destructiva: confirmamos antes de borrar todo. */}
            <button
              className={styles.vaciar}
              onClick={() => {
                if (window.confirm("¿Vaciar todo el carrito?")) {
                  vaciarCarrito();
                }
              }}
            >
              Vaciar
            </button>

            {/* CTA principal. El checkout real lo hare en la Fase 4 (pagos). */}
            <button className={styles.pagar}>Ir a pagar</button>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Carrito;