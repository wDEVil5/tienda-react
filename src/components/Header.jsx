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
const IconoChevronDer = () => (
  <Svg size={14}>
    <path d="m9 6 6 6-6 6" />
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
const IconoGrilla = () => (
  <Svg size={16}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Svg>
);

// Enlaces del segundo piso (además del desplegable de Categorías). Los hashes
// también funcionan desde una ficha de producto.
const NAV = [
  { etiqueta: "Ofertas", hash: "/#catalogo", accion: "ofertas" },
  { etiqueta: "Cómo comprar", hash: "/#como-comprar" },
  { etiqueta: "Nuestra tienda", hash: "/#nuestra-tienda" },
];

// A partir de este scroll el segundo piso (navegación) se colapsa; el primero
// (logo + buscador + carrito) queda pegado arriba.
const UMBRAL_CONDENSADO = 80;

// Búsquedas recientes: se guardan en el navegador (no en el backend) porque son
// una comodidad local del dispositivo, no dato de negocio. Máximo 6, sin repetir.
const CLAVE_RECIENTES = "sumarket.busquedasRecientes";
const MAX_RECIENTES = 6;

function leerRecientes() {
  if (typeof localStorage === "undefined") return [];
  try {
    const bruto = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]");
    return Array.isArray(bruto)
      ? bruto.filter((t) => typeof t === "string" && t.trim()).slice(0, MAX_RECIENTES)
      : [];
  } catch {
    return [];
  }
}

function guardarRecientes(lista) {
  try {
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
  } catch {
    /* almacenamiento lleno o bloqueado: la búsqueda igual funciona */
  }
}

function Header({
  categorias = [],
  productos = [],
  busqueda = "",
  onBuscar,
  onSeleccionarCategoria,
  onCambiarSoloOfertas,
  onVerOfertas,
  onVerCatalogo,
  onAbrirCarrito,
  onAbrirAcceso,
}) {
  const { totalItems } = useCarritoContext();
  const { estaAutenticado, cliente, cerrarSesion } = useCuenta();
  const navegar = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const [categoriasAbierto, setCategoriasAbierto] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState("");
  // Estado condensado: el valor inicial se calcula del scroll actual para no
  // hacer un setState sincrónico dentro del efecto (solo suscribimos el listener).
  const [condensado, setCondensado] = useState(
    () => typeof window !== "undefined" && window.scrollY > UMBRAL_CONDENSADO,
  );
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [recientes, setRecientes] = useState(leerRecientes);
  const cuentaRef = useRef(null);
  const botonCuentaRef = useRef(null);
  const panelCuentaRef = useRef(null);
  const categoriasRef = useRef(null);
  const buscadorRef = useRef(null);
  // "Lo más buscado": accesos rápidos a las primeras categorías del catálogo (no
  // inventamos analítica de búsquedas; usamos las secciones reales de la tienda).
  const populares = categorias.slice(0, 6).map((categoria) => categoria.nombre);
  const [posicionCuenta, setPosicionCuenta] = useState({ top: 0, left: 0 });
  const cerrarMenu = () => setMenuAbierto(false);
  const cerrarCuenta = () => setCuentaAbierta(false);
  // El perfil guarda el nombre completo; en la cabecera usamos solo el primero
  // para que el acceso conserve una anchura estable y sea más personal.
  const etiquetaCuenta = estaAutenticado && cliente?.nombre?.trim()
    ? cliente.nombre.trim().split(/\s+/)[0]
    : "Mi cuenta";

  // El panel se monta en document.body para que ningún recorte de sus ancestros
  // corte sus opciones. Estas coordenadas lo conservan anclado al botón.
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

  // Al bajar más del umbral el segundo piso se colapsa. Listener pasivo; el
  // updater funcional evita renders cuando el estado no cambia.
  useEffect(() => {
    const alScroll = () => {
      const siguiente = window.scrollY > UMBRAL_CONDENSADO;
      setCondensado((actual) => (actual === siguiente ? actual : siguiente));
    };
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  const agregarReciente = (termino) => {
    setRecientes((actuales) => {
      const sinDuplicado = actuales.filter((t) => t.toLowerCase() !== termino.toLowerCase());
      const siguiente = [termino, ...sinDuplicado].slice(0, MAX_RECIENTES);
      guardarRecientes(siguiente);
      return siguiente;
    });
  };

  const quitarReciente = (termino) => {
    setRecientes((actuales) => {
      const siguiente = actuales.filter((t) => t !== termino);
      guardarRecientes(siguiente);
      return siguiente;
    });
  };

  // Ejecuta una búsqueda de texto: aplica el filtro, la recuerda y lleva al
  // catálogo. La usan tanto el submit del formulario como las búsquedas recientes.
  const ejecutarBusqueda = (termino) => {
    const limpio = termino.trim();
    onBuscar?.(limpio);
    onSeleccionarCategoria?.("todas");
    onCambiarSoloOfertas?.(false);
    if (limpio) agregarReciente(limpio);
    setBuscadorAbierto(false);
    navegar("/#catalogo");
  };

  const buscarEnCatalogo = (evento) => {
    evento.preventDefault();
    ejecutarBusqueda(busqueda);
  };

  // Chip de "Lo más buscado": salta directo a esa categoría (resultado asegurado).
  const elegirCategoriaBuscador = (nombre) => {
    seleccionarCategoria(nombre);
    setBuscadorAbierto(false);
  };

  const seleccionarCategoria = (nombre) => {
    onBuscar?.("");
    onSeleccionarCategoria?.(nombre);
    onCambiarSoloOfertas?.(false);
    setCategoriasAbierto(false);
    cerrarMenu();
    navegar("/#catalogo");
  };

  // Marcas presentes en una categoría, derivadas de los productos ya cargados
  // (sin llamada extra). Únicas por nombre y ordenadas alfabéticamente.
  const marcasDeCategoria = (nombre) => {
    const vistas = new Map();
    for (const producto of productos) {
      if (producto.categoria !== nombre || !producto.marca?.nombre) continue;
      if (!vistas.has(producto.marca.nombre)) vistas.set(producto.marca.nombre, producto.marca);
    }
    return [...vistas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  };

  // Click en una marca del mega-menú: busca esa marca en el catálogo. Reusa el
  // buscador (los nombres de producto suelen incluir la marca) → sin filtro nuevo.
  const buscarMarca = (nombreMarca) => {
    onBuscar?.(nombreMarca);
    onSeleccionarCategoria?.("todas");
    onCambiarSoloOfertas?.(false);
    setCategoriasAbierto(false);
    navegar("/#catalogo");
  };

  // Abre el mega-menú y asegura una categoría activa (la primera por defecto).
  const abrirCategorias = () => {
    setCategoriasAbierto(true);
    setCategoriaActiva((actual) => actual || categorias[0]?.nombre || "");
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

  // Cierre del panel de búsqueda (clic fuera / Escape).
  useEffect(() => {
    if (!buscadorAbierto) return undefined;
    const alClicFuera = (evento) => {
      if (!buscadorRef.current?.contains(evento.target)) setBuscadorAbierto(false);
    };
    const alEscape = (evento) => {
      if (evento.key === "Escape") setBuscadorAbierto(false);
    };
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [buscadorAbierto]);

  // Cierre del desplegable de categorías (clic fuera / Escape).
  useEffect(() => {
    if (!categoriasAbierto) return undefined;
    const alClicFuera = (evento) => {
      if (!categoriasRef.current?.contains(evento.target)) setCategoriasAbierto(false);
    };
    const alEscape = (evento) => {
      if (evento.key === "Escape") setCategoriasAbierto(false);
    };
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [categoriasAbierto]);

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
      <button
        className={styles.cuentaAccionPrimaria}
        type="button"
        role="menuitem"
        onClick={() => {
          cerrarCuenta();
          onAbrirAcceso?.();
        }}
      >
        Iniciar sesión
      </button>
      <button
        className={styles.cuentaAccionSecundaria}
        type="button"
        role="menuitem"
        onClick={() => {
          cerrarCuenta();
          onAbrirAcceso?.("registro");
        }}
      >
        Crear cuenta
      </button>
    </>
  );

  const alNavegar = (item) => {
    if (item.accion === "catalogo") onVerCatalogo?.();
    if (item.accion === "ofertas") onVerOfertas?.();
    cerrarMenu();
  };

  const marcasActivas = categoriaActiva ? marcasDeCategoria(categoriaActiva) : [];

  return (
    <header className={`${styles.header} ${condensado ? styles.condensado : ""}`}>
      {/* ---- Piso 1: identidad, buscador y acciones ---- */}
      <div className={styles.barra}>
        <Link to="/" className={styles.logo}>
          Sumarket<em>Express</em>
        </Link>

        <button className={styles.comuna} type="button">
          <IconoPin />
          <span className={styles.comunaTexto}>Providencia</span>
          <IconoChevron />
        </button>

        <form className={styles.buscador} role="search" onSubmit={buscarEnCatalogo} ref={buscadorRef}>
          <span className={styles.buscadorLupa}>
            <IconoLupa />
          </span>
          <input
            type="text"
            placeholder="Busca productos, marcas o categorías"
            value={busqueda}
            onChange={(e) => onBuscar?.(e.target.value)}
            onFocus={() => setBuscadorAbierto(true)}
            aria-label="Buscar productos"
          />
          <button className={styles.buscadorEnviar} type="submit" aria-label="Buscar">
            <IconoLupa />
          </button>

          {buscadorAbierto && (recientes.length > 0 || populares.length > 0) && (
            <div className={styles.buscadorPanel} role="dialog" aria-label="Sugerencias de búsqueda">
              {recientes.length > 0 && (
                <div className={styles.buscadorCol}>
                  <p className={styles.buscadorColTitulo}>Búsqueda reciente</p>
                  <ul className={styles.recientesLista}>
                    {recientes.map((termino) => (
                      <li key={termino} className={styles.recienteItem}>
                        <button
                          type="button"
                          className={styles.recienteTexto}
                          onClick={() => ejecutarBusqueda(termino)}
                        >
                          {termino}
                        </button>
                        <button
                          type="button"
                          className={styles.recienteQuitar}
                          aria-label={`Quitar “${termino}”`}
                          onClick={() => quitarReciente(termino)}
                        >
                          <Svg size={14}>
                            <path d="M6 6l12 12M18 6 6 18" />
                          </Svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {populares.length > 0 && (
                <div className={styles.buscadorCol}>
                  <p className={styles.buscadorColTitulo}>Lo más buscado</p>
                  <div className={styles.chips}>
                    {populares.map((termino) => (
                      <button
                        key={termino}
                        type="button"
                        className={styles.chip}
                        onClick={() => elegirCategoriaBuscador(termino)}
                      >
                        {termino}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        <div className={styles.acciones}>
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
              <span className={styles.cuentaEtiqueta}>{etiquetaCuenta}</span>
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

      {/* ---- Piso 2: navegación (se colapsa al bajar) ---- */}
      <div className={styles.barraNav}>
        <div className={styles.barraNavInner}>
          <div
            className={styles.categorias}
            ref={categoriasRef}
            onMouseEnter={abrirCategorias}
            onMouseLeave={() => setCategoriasAbierto(false)}
          >
            <button
              className={`${styles.categoriasBoton} ${categoriasAbierto ? styles.categoriasBotonActivo : ""}`}
              type="button"
              aria-haspopup="menu"
              aria-expanded={categoriasAbierto}
              onClick={() => (categoriasAbierto ? setCategoriasAbierto(false) : abrirCategorias())}
            >
              <IconoGrilla />
              <span>Categorías</span>
              <IconoChevron />
            </button>
            {categoriasAbierto && categorias.length > 0 && (
              <div className={styles.megaPanel} role="menu">
                <ul className={styles.megaCategorias}>
                  {categorias.map((categoria) => (
                    <li key={categoria.slug ?? categoria.nombre}>
                      <button
                        className={`${styles.megaCategoria} ${categoriaActiva === categoria.nombre ? styles.megaCategoriaActiva : ""}`}
                        type="button"
                        role="menuitem"
                        onMouseEnter={() => setCategoriaActiva(categoria.nombre)}
                        onFocus={() => setCategoriaActiva(categoria.nombre)}
                        onClick={() => seleccionarCategoria(categoria.nombre)}
                      >
                        <span>{categoria.nombre}</span>
                        <IconoChevronDer />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className={styles.megaContenido}>
                  <div className={styles.megaCabecera}>
                    <h3>{categoriaActiva}</h3>
                    <button
                      className={styles.megaVerTodo}
                      type="button"
                      onClick={() => seleccionarCategoria(categoriaActiva)}
                    >
                      Ver todo →
                    </button>
                  </div>
                  {marcasActivas.length > 0 ? (
                    <div className={styles.megaMarcas}>
                      {marcasActivas.map((marca) => (
                        <button
                          key={marca.slug ?? marca.nombre}
                          className={styles.megaMarca}
                          type="button"
                          onClick={() => buscarMarca(marca.nombre)}
                        >
                          {marca.nombre}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.megaVacio}>
                      Explora todos los productos de {categoriaActiva}.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <nav className={styles.navLinks} aria-label="Navegación principal">
            {NAV.map((item) => (
              <Link
                key={item.etiqueta}
                to={item.hash}
                className={styles.navLink}
                onClick={() => alNavegar(item)}
              >
                {item.etiqueta}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Menú móvil: categorías + enlaces + acceso. Permanece montado para animar. */}
      <nav
        id="menu-movil"
        className={`${styles.menuMovil} ${menuAbierto ? styles.menuAbierto : ""}`}
        aria-label="Menú"
        aria-hidden={!menuAbierto}
        inert={menuAbierto ? undefined : ""}
      >
        {categorias.length > 0 && (
          <div className={styles.menuCategorias}>
            <p className={styles.menuTitulo}>Categorías</p>
            {categorias.map((categoria) => (
              <button
                key={categoria.slug ?? categoria.nombre}
                className={styles.menuLink}
                type="button"
                onClick={() => seleccionarCategoria(categoria.nombre)}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>
        )}
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
              {etiquetaCuenta}
            </Link>
          ) : (
            <>
              <button
                className={styles.menuEntrar}
                type="button"
                onClick={() => {
                  cerrarMenu();
                  onAbrirAcceso?.();
                }}
              >
                Entrar
              </button>
              <button
                className={styles.menuCrear}
                type="button"
                onClick={() => {
                  cerrarMenu();
                  onAbrirAcceso?.("registro");
                }}
              >
                Crear cuenta
              </button>
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
