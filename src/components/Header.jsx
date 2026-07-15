import styles from "./Header.module.css";

function Header({ busqueda, onBuscar }) {
  return (
    <header className={styles.header}>
      <span className={styles.logo}>SumarketExpress</span>

      <div className={styles.buscador}>
        <i className="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
        />
      </div>

      <div className={styles.carrito}>
        <i className="fa-solid fa-cart-shopping"></i>
      </div>
    </header>
  );
}

export default Header;