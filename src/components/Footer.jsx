import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer id="footer" className={styles.footer}>
      <div className={styles.principal}>
        <p className={styles.marca}>
          <strong>Sumarket</strong>Express
        </p>

        <nav className={styles.navegacion} aria-label="Navegación del pie de página">
          <a href="#inicio">Inicio</a>
          <a href="#catalogo">Catálogo</a>
          <a href="#footer">Créditos</a>
        </nav>

        <div className={styles.enlaces}>
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            title="Facebook"
          >
            <i className="fa-brands fa-facebook"></i>
          </a>
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            title="YouTube"
          >
            <i className="fa-brands fa-youtube"></i>
          </a>
          <a
            href="https://x.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
            title="Twitter"
          >
            <i className="fa-brands fa-twitter"></i>
          </a>
          <a
            href="https://www.linkedin.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <i className="fa-brands fa-linkedin"></i>
          </a>
          <a
            href="https://github.com/wDEVil5"
            target="_blank"
            rel="noreferrer"
            aria-label="Visitar GitHub de wil"
            title="GitHub"
          >
            <i className="fa-brands fa-github"></i>
          </a>
        </div>
      </div>

      <div className={styles.pie}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} SumarketExpress. Todos los derechos reservados.
        </p>
        <p className={styles.texto}>Proyecto desarrollado con React por wil</p>
      </div>
    </footer>
  );
}

export default Footer;
