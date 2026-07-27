import { Link } from "react-router-dom";
import styles from "./Header.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";

function Header({ busqueda, onBuscar, onAbrirCarrito }) {
  const { totalItems, carrito } = useCarritoContext();
  // Monto total del carrito (estado derivado) para el chip del header.
  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0
  );

  return (
    <header className={styles.header}>
      {/* Franja utilitaria. "Entregar en Providencia" será dinámico cuando
          exista el contexto de modo de entrega/comuna (lógica del sistema). */}
      <div className={styles.franja}>
        <div className={styles.contenedor}>
          <button className={styles.franjaSelector} type="button">
            Entregar en Providencia
            <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </button>
          <span className={styles.franjaSep} aria-hidden="true"></span>
          <span>Retiro gratis en tienda</span>
        </div>
      </div>

      <div className={styles.barraPrincipal}>
        <div className={styles.contenedor}>
          <Link to="/" className={styles.logo}>
            Sumarket<em>Express</em>
          </Link>

          {/* Placeholder: abrirá el menú de categorías en un paso futuro. */}
          <button className={styles.categorias} type="button">
            <i className="fa-solid fa-bars" aria-hidden="true"></i>
            Categorías
          </button>

          <form
            className={styles.buscador}
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
            <i
              className={`fa-solid fa-magnifying-glass ${styles.lupa}`}
              aria-hidden="true"
            ></i>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => onBuscar(e.target.value)}
              aria-label="Buscar producto"
            />
            <button type="submit" className={styles.btnBuscar}>
              Buscar
            </button>
          </form>

          {/* Placeholder: llevará a /login cuando exista la auth (Fase 3). */}
          <button className={styles.entrar} type="button">
            Entrar
          </button>

          <button className={styles.carrito} onClick={onAbrirCarrito}>
            <i className="fa-solid fa-cart-shopping" aria-hidden="true"></i>
            <span className={styles.carritoTexto}>
              <span className={styles.carritoLabel}>Mi carrito</span>
              <span className={styles.carritoMonto}>
                ${total.toLocaleString("es-CL")}
              </span>
            </span>
            {totalItems > 0 && (
              <span className={styles.contador}>{totalItems}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
