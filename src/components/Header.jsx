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

// Íconos por categoría del mega-menú. Se eligen por palabra clave del nombre;
// cualquier categoría que el dueño cree a futuro cae en el genérico (etiqueta).
const IconoFrutas = () => (<Svg size={17}><path d="M12 8c0-2 1.6-4 4-4 0 2-1.6 4-4 4Z" /><path d="M12 8c-2.4 0-6 1.5-6 6a5 5 0 0 0 5 5c.6 0 1.1-.2 1-.9.2.7.8.9 1.4.9a4.6 4.6 0 0 0 4.6-5c0-4.5-3.6-6-6-6Z" /></Svg>);
const IconoLacteos = () => (<Svg size={17}><path d="M8 3h8l-1 3.5V19a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6.5L8 3Z" /><path d="M8.5 8.5h7" /></Svg>);
const IconoLimpieza = () => (<Svg size={17}><path d="M10 3h3v4h-3z" /><path d="M13 5h3l2 4.5V19a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-7.5L11 9h2" /></Svg>);
const IconoCarnes = () => (<Svg size={17}><path d="M13 3a7 7 0 0 1 6 6.5c0 2-1.2 3.2-2.8 3.7C15 14 14 15.5 14 17.5a3.5 3.5 0 1 1-6-2.4" /><circle cx="7" cy="17" r="3" /></Svg>);
const IconoPanaderia = () => (<Svg size={17}><path d="M4 12a4 4 0 0 1 4-4h8a4 4 0 0 1 0 8H8a4 4 0 0 1-4-4Z" /><path d="M9.5 9l-1 6M13 9l-1 6" /></Svg>);
const IconoBebidas = () => (<Svg size={17}><path d="M9.5 3h5v3l-1 2.5V19a2 2 0 0 1-2 2 2 2 0 0 1-2-2V8.5l-1-2.5z" /></Svg>);
const IconoDespensa = () => (<Svg size={17}><rect x="6" y="3.5" width="12" height="17" rx="2" /><path d="M6 8.5h12" /><path d="M10 3.5v5" /></Svg>);
const IconoMascotas = () => (<Svg size={17}><circle cx="6.5" cy="10" r="1.6" /><circle cx="10" cy="7" r="1.6" /><circle cx="14" cy="7" r="1.6" /><circle cx="17.5" cy="10" r="1.6" /><path d="M12 12c-2.4 0-4 2-4 3.6C8 17 9.4 18 12 18s4-1 4-2.4C16 14 14.4 12 12 12Z" /></Svg>);
const IconoCategoriaGenerico = () => (<Svg size={17}><path d="M20.6 13.4 11 23l-8.6-8.6A2 2 0 0 1 2 13V4a2 2 0 0 1 2-2h9a2 2 0 0 1 1.4.6L23 11a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.4" /></Svg>);

const CLAVES_ICONO_CATEGORIA = [
  { claves: ["fruta", "verdura"], Icono: IconoFrutas },
  { claves: ["lácteo", "lacteo", "leche", "huevo", "queso", "fiambre"], Icono: IconoLacteos },
  { claves: ["limpieza", "aseo", "hogar"], Icono: IconoLimpieza },
  { claves: ["carne", "pescado", "pollo"], Icono: IconoCarnes },
  { claves: ["pan", "pastel", "reposter"], Icono: IconoPanaderia },
  { claves: ["bebida", "licor", "agua", "vino", "cerveza"], Icono: IconoBebidas },
  { claves: ["despensa", "abarrote"], Icono: IconoDespensa },
  { claves: ["mascota"], Icono: IconoMascotas },
];

function iconoCategoria(nombre) {
  const texto = nombre.toLowerCase();
  const entrada = CLAVES_ICONO_CATEGORIA.find(({ claves }) => claves.some((clave) => texto.includes(clave)));
  const Icono = entrada?.Icono ?? IconoCategoriaGenerico;
  return <Icono />;
}

// Enlaces del segundo piso (además del desplegable de Categorías). Los hashes
// también funcionan desde una ficha de producto.
const NAV = [
  { etiqueta: "Ofertas", hash: "/ofertas" },
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
  busqueda = "",
  onBuscar,
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
  const populares = categorias.slice(0, 6);
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

  // Ejecuta una búsqueda de texto: la recuerda y abre la página de resultados.
  const ejecutarBusqueda = (termino) => {
    const limpio = termino.trim();
    if (!limpio) return;
    onBuscar?.(limpio);
    agregarReciente(limpio);
    setBuscadorAbierto(false);
    navegar(`/buscar?q=${encodeURIComponent(limpio)}`);
  };

  const buscarEnCatalogo = (evento) => {
    evento.preventDefault();
    ejecutarBusqueda(busqueda);
  };

  // Navega a la página de una categoría o subcategoría (cierra menús abiertos).
  const irACategoria = (cat) => {
    if (!cat) return;
    setCategoriasAbierto(false);
    setBuscadorAbierto(false);
    cerrarMenu();
    navegar(`/categoria/${cat.slug}`);
  };

  const irASubcategoria = (cat, sub) => {
    if (!cat || !sub) return;
    setCategoriasAbierto(false);
    cerrarMenu();
    navegar(`/categoria/${cat.slug}?sub=${encodeURIComponent(sub.slug)}`);
  };

  const irASubcategoriaHija = (cat, sub, hija) => {
    if (!cat || !sub || !hija) return;
    setCategoriasAbierto(false);
    cerrarMenu();
    navegar(`/categoria/${cat.slug}?sub=${encodeURIComponent(sub.slug)}&nivel3=${encodeURIComponent(hija.slug)}`);
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

  const alNavegar = () => {
    cerrarMenu();
  };

  // Categoría activa y sus subcategorías (vienen en el objeto de categoría desde
  // GET /api/categorias). El panel derecho las agrupa como Jumbo.
  const categoriaActivaObj = categorias.find((c) => c.nombre === categoriaActiva) ?? null;
  const subcategoriasActivas = categoriaActivaObj?.subcategorias ?? [];

  return (
    <header className={`${styles.header} ${condensado ? styles.condensado : ""}`}>
      {/* El mega-menú no es un drawer, pero necesita separar visualmente el
          contenido que queda detrás. Se porta al body para cubrir la página sin
          quedar limitado por el header sticky; su z-index queda bajo el header. */}
      {categoriasAbierto && typeof document !== "undefined" && createPortal(
        <button
          type="button"
          className={styles.megaOverlay}
          aria-label="Cerrar menú de categorías"
          tabIndex={-1}
          onClick={() => setCategoriasAbierto(false)}
        />,
        document.body,
      )}

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
                    {populares.map((categoria) => (
                      <button
                        key={categoria.slug ?? categoria.nombre}
                        type="button"
                        className={styles.chip}
                        onClick={() => irACategoria(categoria)}
                      >
                        {categoria.nombre}
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
                        onClick={() => irACategoria(categoria)}
                      >
                        <span className={styles.megaCategoriaIcono}>{iconoCategoria(categoria.nombre)}</span>
                        <span className={styles.megaCategoriaNombre}>{categoria.nombre}</span>
                        <IconoChevronDer />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className={styles.megaContenido}>
                  <div className={styles.megaCabecera}>
                    <h3>
                      <span className={styles.megaTituloIcono} aria-hidden="true">
                        {iconoCategoria(categoriaActiva)}
                      </span>
                      {categoriaActiva}
                    </h3>
                    <button
                      className={styles.megaVerTodo}
                      type="button"
                      onClick={() => irACategoria(categoriaActivaObj)}
                    >
                      Ver todo →
                    </button>
                  </div>
                  {subcategoriasActivas.length > 0 ? (
                    <div className={styles.megaSubs}>
                      {subcategoriasActivas.map((sub) => (
                        <section className={styles.megaGrupo} key={sub.slug ?? sub.id}>
                          <button className={styles.megaSubTitulo} type="button" onClick={() => irASubcategoria(categoriaActivaObj, sub)}>
                            {sub.nombre}
                          </button>
                          {(sub.subcategoriasHijas ?? []).length > 0 ? (
                            <div className={styles.megaHijas}>
                              {sub.subcategoriasHijas.slice(0, 5).map((hija) => (
                                <button key={hija.slug ?? hija.id} className={styles.megaSub} type="button" onClick={() => irASubcategoriaHija(categoriaActivaObj, sub, hija)}>
                                  {hija.nombre}
                                </button>
                              ))}
                              {sub.subcategoriasHijas.length > 5 && (
                                <button className={styles.megaSubVerTodo} type="button" onClick={() => irASubcategoria(categoriaActivaObj, sub)}>
                                  Ver todo →
                                </button>
                              )}
                            </div>
                          ) : <span className={styles.megaSinHijas}>Ver productos</span>}
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.megaVacio}>
                      Esta categoría aún no tiene subcategorías. Usa “Ver todo”.
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
                onClick={() => irACategoria(categoria)}
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
