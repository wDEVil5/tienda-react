import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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

function Header({ onVerOfertas, onVerCatalogo, onAbrirCarrito }) {
  const { totalItems } = useCarritoContext();
  const { estaAutenticado, cliente, cerrarSesion } = useCuenta();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [activo, setActivo] = useState("Catálogo");
  const cuentaRef = useRef(null);
  const cerrarMenu = () => setMenuAbierto(false);
  const cerrarCuenta = () => setCuentaAbierta(false);

  // El menú de cuenta se cierra al hacer clic fuera o con Escape. Es una
  // suscripción a eventos del documento (no un setState en el cuerpo del efecto).
  useEffect(() => {
    if (!cuentaAbierta) return undefined;
    const alClicFuera = (evento) => {
      if (cuentaRef.current && !cuentaRef.current.contains(evento.target)) {
        setCuentaAbierta(false);
      }
    };
    const alEscape = (evento) => {
      if (evento.key === "Escape") setCuentaAbierta(false);
    };
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [cuentaAbierta]);

  const alNavegar = (item) => {
    setActivo(item.etiqueta);
    if (item.accion === "catalogo") onVerCatalogo();
    if (item.accion === "ofertas") onVerOfertas();
    cerrarMenu();
  };

  return (
    <header className={styles.header}>
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
              className={styles.cuentaBoton}
              type="button"
              aria-haspopup="menu"
              aria-expanded={cuentaAbierta}
              onClick={() => setCuentaAbierta((abierta) => !abierta)}
            >
              <IconoUsuario />
              <span>Mi cuenta</span>
              <IconoChevron />
            </button>

            <div
              className={`${styles.cuentaPanel} ${cuentaAbierta ? styles.cuentaPanelAbierto : ""}`}
              role="menu"
              aria-hidden={!cuentaAbierta}
              inert={!cuentaAbierta}
            >
              {estaAutenticado ? (
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
              )}

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
            </div>
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
        inert={!menuAbierto}
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
    </header>
  );
}

export default Header;
