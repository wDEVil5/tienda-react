import { useState } from "react";
import { Link } from "react-router-dom";
import { suscribirNewsletter, ErrorNewsletterApi } from "../services/newsletterApi.js";
import { useIdentidad } from "../context/IdentidadContext.jsx";
import styles from "./Footer.module.css";

const LIMITE_CATEGORIAS_FOOTER = 4;

// Columna del footer. En escritorio se ve como columna (CSS muestra los enlaces
// siempre); en móvil es un acordeón: el botón alterna el estado y CSS muestra
// u oculta los enlaces. Se usa estado en vez de <details> porque Chrome oculta
// el contenido cerrado con content-visibility (no se puede forzar por CSS).
function AcordeonCol({ titulo, children }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={styles.col}>
      <button
        type="button"
        className={styles.colTitulo}
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        {titulo}
      </button>
      <div
        className={`${styles.colLinks} ${abierto ? styles.colAbierto : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function Footer({
  productos,
  onBuscar,
  onSeleccionarCategoria,
  onCambiarSoloOfertas,
  onVerOfertas,
  onVerCatalogo,
}) {
  // La lista se deriva del catálogo disponible. Cuando la API propia entregue
  // categorías, el footer las reflejará sin mantener una segunda lista manual.
  const categorias = [...new Set(productos.map((producto) => producto.categoria))].slice(
    0,
    LIMITE_CATEGORIAS_FOOTER,
  );

  const seleccionarCategoria = (categoria) => {
    onBuscar("");
    onSeleccionarCategoria(categoria);
    onCambiarSoloOfertas(false);
  };

  // Datos de marca desde la identidad de la tienda (editable en /admin/identidad).
  const identidad = useIdentidad();

  // Redes DE LA TIENDA: solo las que el dueño cargó en la identidad. Los links
  // personales del desarrollador van aparte, en la atribución del copyright.
  const redesTienda = [
    identidad.instagram && { url: identidad.instagram, icono: "fa-instagram", nombre: "Instagram" },
    identidad.facebook && { url: identidad.facebook, icono: "fa-facebook", nombre: "Facebook" },
    identidad.tiktok && { url: identidad.tiktok, icono: "fa-tiktok", nombre: "TikTok" },
  ].filter(Boolean);

  const [emailNL, setEmailNL] = useState("");
  const [cargandoNL, setCargandoNL] = useState(false);
  const [exitoNL, setExitoNL] = useState(false);
  const [errorNL, setErrorNL] = useState(null);

  const onSubmitNL = async (e) => {
    e.preventDefault();
    if (!emailNL.trim()) return;
    setCargandoNL(true);
    setErrorNL(null);
    try {
      await suscribirNewsletter(emailNL);
      setExitoNL(true);
      setEmailNL("");
    } catch (err) {
      setErrorNL(
        err instanceof ErrorNewsletterApi
          ? err.message
          : "Error al suscribirte. Intenta de nuevo."
      );
    } finally {
      setCargandoNL(false);
    }
  };

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
            <div className={styles.nlTexto}>
              <h2 className={styles.nlTitulo}>
                Las ofertas, cada lunes en tu correo
              </h2>
              <p className={styles.nlSub}>
                Una vez por semana · te sales con un clic.
              </p>
            </div>
            <div className={styles.nlFormWrap}>
              {exitoNL ? (
                <div className={styles.nlExito}>
                  <strong>¡Gracias por suscribirte!</strong>
                  <p>Pronto recibirás nuestras ofertas.</p>
                </div>
              ) : (
                <form className={styles.nlForm} onSubmit={onSubmitNL}>
                  <input
                    type="email"
                    placeholder="tu@correo.cl"
                    aria-label="Tu correo electrónico"
                    required
                    value={emailNL}
                    onChange={(e) => setEmailNL(e.target.value)}
                    disabled={cargandoNL}
                  />
                  <button type="submit" disabled={cargandoNL}>
                    {cargandoNL ? "Enviando..." : "Suscribirme"}
                  </button>
                </form>
              )}
              {errorNL && <p className={styles.nlError} role="alert">{errorNL}</p>}
              {!exitoNL && (
                <p className={styles.nlNota}>
                  Al suscribirte aceptas la política de privacidad.
                </p>
              )}
            </div>
          </div>
          {/* Nota solo-móvil: va debajo del form (en escritorio se usan las dos
              notas de arriba: subtítulo bajo el título + legal bajo el form). */}
          <p className={styles.nlNotaMovil}>
            Una vez por semana · te sales con un clic.
          </p>
        </div>

        {/* Banda 2: 5 columnas (marca + 4 grupos de enlaces). */}
        <div className={`${styles.banda} ${styles.columnas}`}>
          <div className={styles.colMarca}>
            <p className={styles.marca}>
              Sumarket<em>Express</em>
            </p>
            <p className={styles.dato}>{identidad.direccion}</p>
            <p className={styles.dato}>{identidad.horarioTexto}</p>
            <p className={styles.dato}>
              <a className={styles.datoEnlace} href={`tel:${identidad.telefono.replace(/\s+/g, "")}`}>
                {identidad.telefono}
              </a>
            </p>
            <p className={styles.dato}>
              <a className={styles.datoEnlace} href={`mailto:${identidad.email}`}>
                {identidad.email}
              </a>
            </p>
            <p className={styles.abierto}>
              <span className={styles.punto} aria-hidden="true"></span>
              Abierto ahora
            </p>
          </div>

          {/* En escritorio se ven como columnas; en móvil son acordeones. */}
          <AcordeonCol titulo="Comprar">
            <Link to="/#catalogo" className={styles.enlace} onClick={onVerCatalogo}>
              Todo el catálogo
            </Link>
            <Link to="/#catalogo" className={styles.enlace} onClick={onVerOfertas}>
              Ofertas de la semana
            </Link>
            {categorias.map((categoria) => (
              <Link
                key={categoria}
                to="/#catalogo"
                className={styles.enlace}
                onClick={() => seleccionarCategoria(categoria)}
              >
                {categoria}
              </Link>
            ))}
          </AcordeonCol>

          <AcordeonCol titulo="Tu cuenta">
            <button className={styles.enlace} type="button">
              Entrar
            </button>
            <button className={styles.enlace} type="button">
              Crear cuenta
            </button>
            <button className={styles.enlace} type="button">
              Mis pedidos
            </button>
            <button className={styles.enlace} type="button">
              Mi perfil
            </button>
            <button className={styles.enlace} type="button">
              Volver a comprar
            </button>
          </AcordeonCol>

          <AcordeonCol titulo="Ayuda">
            <button className={styles.enlace} type="button">
              Cómo comprar
            </button>
            <button className={styles.enlace} type="button">
              Retiro y despacho
            </button>
            <button className={styles.enlace} type="button">
              Medios de pago
            </button>
            <button className={styles.enlace} type="button">
              Cambios y devoluciones
            </button>
            <Link to="/faq" className={styles.enlace}>
              Preguntas frecuentes
            </Link>
          </AcordeonCol>

          <AcordeonCol titulo="La tienda">
            <Link to="/nosotros" className={styles.enlace}>
              Sobre nosotros
            </Link>
            <button className={styles.enlace} type="button">
              Dónde estamos
            </button>
            <button className={styles.enlace} type="button">
              Trabaja con nosotros
            </button>
            <button className={styles.enlace} type="button">
              Contacto
            </button>
          </AcordeonCol>
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
            {/* Redes de la tienda: solo las cargadas en la identidad. */}
            {redesTienda.length > 0 && (
              <div className={styles.redes}>
                {redesTienda.map((red) => (
                  <a
                    key={red.icono}
                    href={red.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={red.nombre}
                    title={red.nombre}
                  >
                    <i className={`fa-brands ${red.icono}`} aria-hidden="true"></i>
                  </a>
                ))}
              </div>
            )}

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
            © {new Date().getFullYear()} {identidad.nombre} · Desarrollado por Wilnes
            <span className={styles.dev}>
              <a
                href="https://github.com/wDEVil5"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub del desarrollador"
                title="GitHub"
              >
                <i className="fa-brands fa-github" aria-hidden="true"></i>
              </a>
              <a
                href="https://www.linkedin.com/in/wilnes-devil-5ab6b81a6/?locale=es"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn del desarrollador"
                title="LinkedIn"
              >
                <i className="fa-brands fa-linkedin" aria-hidden="true"></i>
              </a>
            </span>
          </p>
          <nav className={styles.legalLinks} aria-label="Legal">
            <Link to="/terminos" className={styles.enlace}>
              Términos de servicio
            </Link>
            <Link to="/privacidad" className={styles.enlace}>
              Política de privacidad
            </Link>
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
