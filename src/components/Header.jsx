import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import styles from "./Header.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";

function Header({ busqueda, onBuscar, onAbrirCarrito }) {
  const { totalItems, carrito } = useCarritoContext();
  const [menuAbierto, setMenuAbierto] = useState(false); // menú hamburguesa (móvil)
  const cerrarMenu = () => setMenuAbierto(false);

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

          {/* Hamburguesa: solo visible en móvil (CSS). Abre el menú de abajo. */}
          <button
            className={styles.hamburguesa}
            type="button"
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            aria-label="Abrir menú"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <i
              className={`fa-solid ${menuAbierto ? "fa-xmark" : "fa-bars"}`}
              aria-hidden="true"
            ></i>
          </button>

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

      {/* Menú móvil: recupera la navegación y "Entrar" que se ocultan en la
          barra. Solo se muestra cuando la hamburguesa está abierta. */}
      {menuAbierto && (
        <nav id="menu-movil" className={styles.menuMovil} aria-label="Menú">
          <NavLink
            to="/"
            end
            onClick={cerrarMenu}
            className={({ isActive }) =>
              `${styles.menuLink} ${isActive ? styles.menuLinkActivo : ""}`
            }
          >
            Catálogo
          </NavLink>
          <button className={styles.menuLink} type="button" onClick={cerrarMenu}>
            Ofertas
          </button>
          <button className={styles.menuLink} type="button" onClick={cerrarMenu}>
            Cómo comprar
          </button>
          <button className={styles.menuLink} type="button" onClick={cerrarMenu}>
            Nuestra tienda
          </button>
          <button
            className={styles.menuEntrar}
            type="button"
            onClick={cerrarMenu}
          >
            Entrar
          </button>
        </nav>
      )}

      {/* Fila de navegación. Solo "Catálogo" tiene ruta real hoy; el resto
          son placeholders (Ofertas → filtro, secciones del Home futuras). */}
      <nav className={styles.navFila} aria-label="Navegación principal">
        <div className={styles.contenedor}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navActivo : ""}`
            }
          >
            Catálogo
          </NavLink>
          <button className={styles.navLink} type="button">
            Ofertas
          </button>
          <button className={styles.navLink} type="button">
            Cómo comprar
          </button>
          <button className={styles.navLink} type="button">
            Nuestra tienda
          </button>
        </div>
      </nav>

      {/* Barra de estado. "Tienda abierta" será dinámico cuando exista la
          lógica de horario/corte de las reglas de la tienda (Fase 5). */}
      <div className={styles.estado}>
        <div className={styles.contenedor}>
          <span className={styles.estadoInfo}>
            <span className={styles.punto} aria-hidden="true"></span>
            <strong>Tienda abierta</strong> · pedidos hasta las 19:00 se retiran
            hoy mismo
          </span>
          <button className={styles.verHorarios} type="button">
            Ver horarios
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
