import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.marca}>SumarketExpress v2</p>
      <p className={styles.texto}>
        Proyecto desarrollado con React por MI, wil · {new Date().getFullYear()}
      </p>
      <div className={styles.enlaces}>
        <a href="https://github.com/wDEVil5" target="_blank" rel="noreferrer">
          <i className="fa-brands fa-github"></i> GitHub
        </a>
      </div>
    </footer>
  );
}

export default Footer;