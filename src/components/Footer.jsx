import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer id="footer" className={styles.footer}>
      <div className={styles.contenedor}>
        {/* Banda 1: Newsletter. El envío real requiere backend (Fase 2). */}
        <div className={styles.banda}>
          {/* La marca solo se muestra aquí en móvil (en escritorio vive en la
              columna de marca de la banda de abajo). */}
          <p className={styles.marcaMovil}>
            Sumarket<em>Express</em>
          </p>

          <div className={styles.newsletter}>
            <h2 className={styles.nlTitulo}>
              Las ofertas, cada lunes en tu correo
            </h2>
            <form
              className={styles.nlForm}
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="tu@correo.cl"
                aria-label="Tu correo electrónico"
              />
              <button type="submit">Suscribirme</button>
            </form>
          </div>
          <p className={styles.nlNota}>
            Una vez por semana · te sales con un clic.
          </p>
        </div>

        {/* Banda 2: 5 columnas (marca + 4 grupos de enlaces). */}
        <div className={`${styles.banda} ${styles.columnas}`}>
          <div className={styles.colMarca}>
            <p className={styles.marca}>
              Sumarket<em>Express</em>
            </p>
            <p className={styles.dato}>Av. Providencia 1234, Santiago</p>
            <p className={styles.dato}>Lun a Sáb · 09:00 – 20:00</p>
            <p className={styles.dato}>+56 2 2345 6789</p>
            <p className={styles.dato}>hola@sumarketexpress.cl</p>
            <p className={styles.abierto}>
              <span className={styles.punto} aria-hidden="true"></span>
              Abierto ahora
            </p>
          </div>

          {/* En escritorio se ven como columnas (contenido forzado visible por
              CSS); en móvil, <details> los vuelve acordeones nativos de 48px. */}
          <details className={styles.col}>
            <summary className={styles.colTitulo}>Comprar</summary>
            <div className={styles.colLinks}>
              <Link to="/" className={styles.enlace}>
                Catálogo
              </Link>
              <button className={styles.enlace} type="button">
                Ofertas
              </button>
              <button className={styles.enlace} type="button">
                Categorías
              </button>
              <button className={styles.enlace} type="button">
                Novedades
              </button>
            </div>
          </details>

          <details className={styles.col}>
            <summary className={styles.colTitulo}>Tu cuenta</summary>
            <div className={styles.colLinks}>
              <button className={styles.enlace} type="button">
                Entrar
              </button>
              <button className={styles.enlace} type="button">
                Mis pedidos
              </button>
              <button className={styles.enlace} type="button">
                Mis direcciones
              </button>
            </div>
          </details>

          <details className={styles.col}>
            <summary className={styles.colTitulo}>Ayuda</summary>
            <div className={styles.colLinks}>
              <button className={styles.enlace} type="button">
                Cómo comprar
              </button>
              <button className={styles.enlace} type="button">
                Envíos y retiro
              </button>
              <button className={styles.enlace} type="button">
                Devoluciones
              </button>
              <button className={styles.enlace} type="button">
                Contacto
              </button>
            </div>
          </details>

          <details className={styles.col}>
            <summary className={styles.colTitulo}>La tienda</summary>
            <div className={styles.colLinks}>
              <button className={styles.enlace} type="button">
                Nuestra historia
              </button>
              <button className={styles.enlace} type="button">
                Trabaja con nosotros
              </button>
              <button className={styles.enlace} type="button">
                Términos
              </button>
            </div>
          </details>
        </div>

        {/* Banda 3: medios de pago + redes + selector de moneda/idioma. */}
        <div className={`${styles.banda} ${styles.utilidades}`}>
          <div className={styles.pagos}>
            <span className={styles.chipPago}>Mercado Pago</span>
            <span className={styles.chipPago}>Débito</span>
            <span className={styles.chipPago}>Crédito</span>
            <span className={styles.chipPago}>Transferencia</span>
          </div>

          <div className={styles.derecha}>
            <div className={styles.redes}>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                title="Facebook"
              >
                <i className="fa-brands fa-facebook" aria-hidden="true"></i>
              </a>
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                title="YouTube"
              >
                <i className="fa-brands fa-youtube" aria-hidden="true"></i>
              </a>
              <a
                href="https://x.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                title="X"
              >
                <i className="fa-brands fa-x-twitter" aria-hidden="true"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/wilnes-devil-5ab6b81a6/?locale=es"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <i className="fa-brands fa-linkedin" aria-hidden="true"></i>
              </a>
              <a
                href="https://github.com/wDEVil5"
                target="_blank"
                rel="noreferrer"
                aria-label="Visitar GitHub de wil"
                title="GitHub"
              >
                <i className="fa-brands fa-github" aria-hidden="true"></i>
              </a>
            </div>

            {/* Placeholder: cambio de moneda/idioma en un paso futuro. */}
            <button className={styles.selector} type="button">
              CLP $ · Español
              <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* Banda 4: legal. */}
        <div className={styles.legal}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} SumarketExpress · Precios en CLP con IVA
            incluido.
          </p>
          <nav className={styles.legalLinks} aria-label="Legal">
            <button className={styles.enlace} type="button">
              Términos
            </button>
            <button className={styles.enlace} type="button">
              Privacidad
            </button>
            <button className={styles.enlace} type="button">
              Accesibilidad
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
