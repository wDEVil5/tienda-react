import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import { useCuenta } from "../context/CuentaContext.jsx";

// Íconos lineales (1.5px) recreados como SVG inline: sin dependencia de Font
// Awesome y sin emoji, como pide la dirección visual. Heredan currentColor.
function Svg({ children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const IconoPin = () => (
  <Svg size={15}>
    <path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </Svg>
);
const IconoChevron = () => (
  <Svg size={13}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
const IconoUsuario = () => (
  <Svg size={16}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </Svg>
);
const IconoLupa = () => (
  <Svg size={16}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);
const IconoCarrito = () => (
  <Svg size={17}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2.5 3h2l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" />
  </Svg>
);

// Los ítems de navegación del home. "Catálogo" queda como activo por defecto:
// es la vista de aterrizaje. Los hashes también funcionan desde una ficha.
const NAV = [
  { etiqueta: "Catálogo", hash: "/#catalogo", accion: "catalogo" },
  { etiqueta: "Ofertas", hash: "/#catalogo", accion: "ofertas" },
  { etiqueta: "Cómo comprar", hash: "/#como-comprar" },
  { etiqueta: "Nuestra tienda", hash: "/#nuestra-tienda" },
];

const INICIO_REDUCCION_LOGO = 40;
const FIN_REDUCCION_LOGO = 180;

function obtenerProgresoLogo(scrollY = 0) {
  return Math.min(
    1,
    Math.max(0, (scrollY - INICIO_REDUCCION_LOGO) / (FIN_REDUCCION_LOGO - INICIO_REDUCCION_LOGO)),
  );
}

function Header({
  busqueda = "",
  onBuscar,
  onSeleccionarCategoria,
  onCambiarSoloOfertas,
  onVerOfertas,
  onVerCatalogo,
  onAbrirCarrito,
}) {
  const { totalItems } = useCarritoContext();
  const { estaAutenticado, cliente, cerrarSesion } = useCuenta();
  const navegar = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [activo, setActivo] = useState("Catálogo");
  // Estado condensado: el valor inicial se calcula del scroll actual para no
  // hacer un setState sincrónico dentro del efecto (solo suscribimos el listener).
  const [condensado, setCondensado] = useState(
    () => typeof window !== "undefined" && window.scrollY > 140,
  );
  const [progresoLogo, setProgresoLogo] = useState(
    () => typeof window !== "undefined" ? obtenerProgresoLogo(window.scrollY) : 0,
  );
  const cuentaRef = useRef(null);
  const botonCuentaRef = useRef(null);
  const panelCuentaRef = useRef(null);
  const [posicionCuenta, setPosicionCuenta] = useState({ top: 0, left: 0 });
  const cerrarMenu = () => setMenuAbierto(false);
  const cerrarCuenta = () => setCuentaAbierta(false);

  // El panel se monta en document.body para que el clip-path de .acciones no
  // recorte sus opciones. Estas coordenadas lo conservan anclado al botón.
  const actualizarPosicionCuenta = useCallback(() => {
    const boton = botonCuentaRef.current;
    if (!boton) return;

    const rectangulo = boton.getBoundingClientRect();
    const anchoPanel = 300;
    const margenViewport = 16;
    setPosicionCuenta({
      top: rectangulo.bottom + 12,
      left: Math.max(
        margenViewport,
        Math.min(rectangulo.right - anchoPanel, window.innerWidth - anchoPanel - margenViewport),
      ),
    });
  }, []);

  // Al bajar más de 140px el header se condensa (buscador + carrito siempre
  // visibles). Listener pasivo; se limpia al desmontar.
  useEffect(() => {
    const alScroll = () => {
      const scrollY = window.scrollY;
      const siguienteProgresoLogo = obtenerProgresoLogo(scrollY);

      setCondensado((actual) => {
        const siguiente = scrollY > 140;
        return actual === siguiente ? actual : siguiente;
      });
      setProgresoLogo((actual) => (
        Math.abs(actual - siguienteProgresoLogo) < 0.01 ? actual : siguienteProgresoLogo
      ));
    };
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  const buscarEnCatalogo = (evento) => {
    evento.preventDefault();
    onSeleccionarCategoria?.("todas");
    onCambiarSoloOfertas?.(false);
    navegar("/#catalogo");
  };

  // El menú de cuenta se cierra al hacer clic fuera o con Escape. Al estar
  // portaleado, tanto el botón como el panel deben considerarse "dentro".
  useEffect(() => {
    if (!cuentaAbierta) return undefined;
    const alClicFuera = (evento) => {
      const clicEnBoton = cuentaRef.current?.contains(evento.target);
      const clicEnPanel = panelCuentaRef.current?.contains(evento.target);
      if (!clicEnBoton && !clicEnPanel) {
        setCuentaAbierta(false);
      }
    };
    const alEscape = (evento) => {
      if (evento.key === "Escape") setCuentaAbierta(false);
    };
    actualizarPosicionCuenta();
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alEscape);
    window.addEventListener("resize", actualizarPosicionCuenta);
    window.addEventListener("scroll", actualizarPosicionCuenta, { passive: true });
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alEscape);
      window.removeEventListener("resize", actualizarPosicionCuenta);
      window.removeEventListener("scroll", actualizarPosicionCuenta);
    };
  }, [actualizarPosicionCuenta, cuentaAbierta]);

  const contenidoCuenta = estaAutenticado ? (
    <>
      <p className={styles.cuentaTitulo}>Hola{cliente?.nombre ? `, ${cliente.nombre}` : ""}</p>
      <p className={styles.cuentaBeneficio}>Gestiona tus pedidos y tus datos.</p>
      <Link className={styles.cuentaAccionPrimaria} to="/mi-cuenta" role="menuitem" onClick={cerrarCuenta}>
        Ir a mi cuenta
      </Link>
      <button
        className={styles.cuentaAccionSecundaria}
        type="button"
        role="menuitem"
        onClick={() => {
          cerrarCuenta();
          cerrarSesion();
        }}
      >
        Cerrar sesión
      </button>
    </>
  ) : (
    <>
      <p className={styles.cuentaTitulo}>Entra a tu cuenta</p>
      <p className={styles.cuentaBeneficio}>
        Guarda tus productos habituales y repite el pedido en un clic.
      </p>
      <Link className={styles.cuentaAccionPrimaria} to="/login" role="menuitem" onClick={cerrarCuenta}>
        Iniciar sesión
      </Link>
      <Link className={styles.cuentaAccionSecundaria} to="/registro" role="menuitem" onClick={cerrarCuenta}>
        Crear cuenta
      </Link>
    </>
  );

  const alNavegar = (item) => {
    setActivo(item.etiqueta);
    if (item.accion === "catalogo") onVerCatalogo();
    if (item.accion === "ofertas") onVerOfertas();
    cerrarMenu();
  };

  return (
    <header
      className={`${styles.header} ${condensado ? styles.condensado : ""}`}
      style={{
        "--escala-logo-sticky": 1 - progresoLogo * 0.22,
      }}
    >
      {/* Barra condensada (al bajar): logo compacto + buscador + comuna +
          mini-carrito. Solo se muestra en escritorio cuando hay scroll (CSS). */}
      <div className={styles.barraCondensada}>
        <form className={styles.condBuscador} role="search" onSubmit={buscarEnCatalogo}>
          <span className={styles.condLupa}>
            <IconoLupa />
          </span>
          <input
            type="text"
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={(e) => onBuscar?.(e.target.value)}
            aria-label="Buscar producto"
          />
        </form>
        <button className={styles.condComuna} type="button">
          <span>Providencia</span>
          <IconoChevron />
        </button>
        {/* Mismo botón de carrito que el header completo: no cambia. */}
        <button className={styles.carrito} type="button" onClick={onAbrirCarrito}>
          <IconoCarrito />
          <span className={styles.carritoTexto}>Carrito</span>
          <span className={styles.carritoContador} aria-label={`${totalItems} productos en el carrito`}>
            · {totalItems}
          </span>
        </button>
      </div>

      <div className={styles.barra}>
        <Link to="/" className={styles.logo} onClick={() => setActivo("Catálogo")}>
          Sumarket<em>Express</em>
        </Link>

        {/* Navegación centrada dentro de una cápsula; el activo es una píldora
            blanca con sombra mínima. Oculta en móvil (va al menú). */}
        <nav className={styles.capsula} aria-label="Navegación principal">
          {NAV.map((item) => (
            <Link
              key={item.etiqueta}
              to={item.hash}
              className={`${styles.navLink} ${activo === item.etiqueta ? styles.navActivo : ""}`}
              aria-current={activo === item.etiqueta ? "page" : undefined}
              onClick={() => alNavegar(item)}
            >
              {item.etiqueta}
            </Link>
          ))}
        </nav>

        <div className={styles.acciones}>
          {/* Selector de comuna (placeholder: el picker real llega con el
              contexto de modo de entrega). */}
          <button className={styles.comuna} type="button">
            <IconoPin />
            <span>Providencia</span>
            <IconoChevron />
          </button>

          <span className={styles.sepAcciones} aria-hidden="true" />

          {/* Menú de cuenta: un solo botón que abre las acciones con su beneficio. */}
          <div className={styles.cuentaMenu} ref={cuentaRef}>
            <button
              ref={botonCuentaRef}
              className={styles.cuentaBoton}
              type="button"
              aria-haspopup="menu"
              aria-expanded={cuentaAbierta}
              aria-controls="menu-cuenta"
              onClick={() => {
                if (!cuentaAbierta) actualizarPosicionCuenta();
                setCuentaAbierta((abierta) => !abierta);
              }}
            >
              <IconoUsuario />
              <span>Mi cuenta</span>
              <IconoChevron />
            </button>
          </div>

          <button className={styles.carrito} type="button" onClick={onAbrirCarrito}>
            <IconoCarrito />
            <span className={styles.carritoTexto}>Carrito</span>
            <span className={styles.carritoContador} aria-label={`${totalItems} productos en el carrito`}>
              · {totalItems}
            </span>
          </button>

          {/* Hamburguesa: solo móvil (CSS). */}
          <button
            className={styles.hamburguesa}
            type="button"
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <Svg size={20}>
              {menuAbierto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </Svg>
          </button>
        </div>
      </div>

      {/* Menú móvil: permanece montado para animar; `inert` lo saca del teclado
          cuando está plegado. */}
      <nav
        id="menu-movil"
        className={`${styles.menuMovil} ${menuAbierto ? styles.menuAbierto : ""}`}
        aria-label="Menú"
        aria-hidden={!menuAbierto}
        inert={menuAbierto ? undefined : ""}
      >
        {NAV.map((item) => (
          <Link
            key={item.etiqueta}
            to={item.hash}
            className={styles.menuLink}
            onClick={() => alNavegar(item)}
          >
            {item.etiqueta}
          </Link>
        ))}
        <div className={styles.menuAcceso}>
          {estaAutenticado ? (
            <Link className={styles.menuEntrar} to="/mi-cuenta" onClick={cerrarMenu}>
              Mi cuenta
            </Link>
          ) : (
            <>
              <Link className={styles.menuEntrar} to="/login" onClick={cerrarMenu}>
                Entrar
              </Link>
              <Link className={styles.menuCrear} to="/registro" onClick={cerrarMenu}>
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>

      {typeof document !== "undefined" && createPortal(
        <div
          id="menu-cuenta"
          ref={panelCuentaRef}
          className={`${styles.cuentaPanel} ${cuentaAbierta ? styles.cuentaPanelAbierto : ""}`}
          style={posicionCuenta}
          role="menu"
          aria-hidden={!cuentaAbierta}
          inert={cuentaAbierta ? undefined : ""}
        >
          {contenidoCuenta}
          <div className={styles.cuentaSeparador} />
          <Link className={styles.cuentaEnlace} to="/mi-cuenta/pedidos" role="menuitem" onClick={cerrarCuenta}>
            Mis pedidos
          </Link>
          <Link className={styles.cuentaEnlace} to="/mi-cuenta" role="menuitem" onClick={cerrarCuenta}>
            Mis listas de compra
          </Link>
          <button className={styles.cuentaEnlace} type="button" role="menuitem" onClick={cerrarCuenta}>
            Comuna de entrega
          </button>
        </div>,
        document.body,
      )}
    </header>
  );
}

export default Header;
