import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer id="footer" className={styles.footer}>
      <div className={styles.contenedor}>
        {/* Banda 1: Newsletter. El envío real requiere backend (Fase 2). */}
        <div className={styles.banda}>
          <div className={styles.newsletter}>
            <div>
              <h2 className={styles.nlTitulo}>Ofertas frescas en tu correo</h2>
              <p className={styles.nlSub}>
                Recibe cada semana los productos en oferta y las novedades de la
                tienda.
              </p>
            </div>
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
            Al suscribirte aceptas recibir correos comerciales. Puedes cancelar
            cuando quieras.
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

          <nav className={styles.col} aria-label="Comprar">
            <p className={styles.eyebrow}>Comprar</p>
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
          </nav>

          <nav className={styles.col} aria-label="Tu cuenta">
            <p className={styles.eyebrow}>Tu cuenta</p>
            <button className={styles.enlace} type="button">
              Entrar
            </button>
            <button className={styles.enlace} type="button">
              Mis pedidos
            </button>
            <button className={styles.enlace} type="button">
              Mis direcciones
            </button>
          </nav>

          <nav className={styles.col} aria-label="Ayuda">
            <p className={styles.eyebrow}>Ayuda</p>
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
          </nav>

          <nav className={styles.col} aria-label="La tienda">
            <p className={styles.eyebrow}>La tienda</p>
            <button className={styles.enlace} type="button">
              Nuestra historia
            </button>
            <button className={styles.enlace} type="button">
              Trabaja con nosotros
            </button>
            <button className={styles.enlace} type="button">
              Términos
            </button>
          </nav>
        </div>

        {/* Bandas 3 (pagos/redes/selector) y 4 (legal) llegan en el paso 2. */}
      </div>
    </footer>
  );
}

export default Footer;
