import styles from "./Header.module.css";

function Header({ busqueda, onBuscar, totalItems, onAbrirCarrito }) {
  return (
    <header className={styles.header}>
      <span className={styles.logo}>
        <strong>Sumarket</strong>Express
      </span>

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
        {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
      </button>
    </header>
  );
}
export default Header;