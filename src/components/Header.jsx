import styles from "./Header.module.css";

function Header({ busqueda, onBuscar, totalItems, onAbrirCarrito }) {
  return (
    <header id="inicio" className={styles.header}>
      <span className={styles.logo}>
        <strong>Sumarket</strong>Express
      </span>

      <div className={styles.contenido}>
        <div className={styles.buscador}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
          />
        </div>

        <button className={styles.carrito} onClick={onAbrirCarrito}>
          <i className="fa-solid fa-cart-shopping"></i>
          <span className={styles.textoCarrito}>Carrito</span>
          {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
        </button>
      </div>
    </header>
  );
}
export default Header;
