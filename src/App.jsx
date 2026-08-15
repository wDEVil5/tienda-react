import { useState, useEffect } from "react";
import { Navigate, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import PaginaCatalogo from "./pages/PaginaCatalogo.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import Checkout from "./pages/Checkout.jsx";
import CheckoutPago from "./pages/CheckoutPago.jsx";
import EstadoPago from "./pages/EstadoPago.jsx";
import AdminProductos from "./pages/AdminProductos.jsx";
import AdminProductoEditor from "./pages/AdminProductoEditor.jsx";
import AdminPedidos from "./pages/AdminPedidos.jsx";
import AdminResumen from "./pages/AdminResumen.jsx";
import AdminCuenta from "./pages/AdminCuenta.jsx";
import AdminAcceso from "./pages/AdminAcceso.jsx";
import { AdminRecuperarContrasena, AdminRestablecerContrasena } from "./pages/AdminRecuperar.jsx";
import AdminEquipo from "./pages/AdminEquipo.jsx";
import AdminEnvios from "./pages/AdminEnvios.jsx";
import AdminClientes from "./pages/AdminClientes.jsx";
import AdminInventario from "./pages/AdminInventario.jsx";
import AdminIdentidad from "./pages/AdminIdentidad.jsx";
import AdminContenido from "./pages/AdminContenido.jsx";
import AdminBanners from "./pages/AdminBanners.jsx";
import AdminCategorias from "./pages/AdminCategorias.jsx";
import AdminMarcas from "./pages/AdminMarcas.jsx";
import { Login, Registro } from "./pages/Acceso.jsx";
import { RecuperarContrasena, RestablecerContrasena } from "./pages/RecuperarCuenta.jsx";
import NewsletterBaja from "./pages/NewsletterBaja.jsx";
import PaginaContenido from "./pages/PaginaContenido.jsx";
import MiCuenta from "./pages/MiCuenta.jsx";
import MisPedidos from "./pages/MisPedidos.jsx";
import DetallePedido from "./pages/DetallePedido.jsx";
import DatosCuenta from "./pages/DatosCuenta.jsx";
import Carrito from "./components/Carrito.jsx";
import Toast from "./components/Toast.jsx";
import styles from "./App.module.css";
import Header from "./components/Header.jsx";
import ModalAcceso from "./components/ModalAcceso.jsx";
import Footer from "./components/Footer.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import { obtenerCatalogo, obtenerCategorias, obtenerMasVendidos } from "./services/productosApi.js";

function App() {
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const esAdmin = ubicacion.pathname.startsWith("/admin");
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]); // base para Home (carruseles) y fichas
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [fuenteCatalogo, setFuenteCatalogo] = useState(null);
  const [ofertasDestacadas, setOfertasDestacadas] = useState(null);
  const [masVendidos, setMasVendidos] = useState(null);
  const [cargando, setCargando] = useState(true); // ¿esta cargando?
  const [error, setError] = useState(null); // null = sin error, string = mensaje a mostrar
  const [reintento, setReintento] = useState(0);

  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [accesoAbierto, setAccesoAbierto] = useState(false);
  const [modoAcceso, setModoAcceso] = useState("login");

  // Categorías (con sus subcategorías) para el header y el Home.
  useEffect(() => {
    if (esAdmin) return;
    obtenerCategorias().then((categorias) => {
      if (categorias) setCategoriasDisponibles(categorias);
    });
  }, [esAdmin]);

  // Carga base de la tienda: una página de productos que alimenta los carruseles
  // del Home y las fichas. El catálogo por categoría/búsqueda/ofertas vive en su
  // propia página (PaginaCatalogo), que hace sus propias consultas por URL.
  useEffect(() => {
    if (esAdmin) return undefined;
    let vigente = true;
    obtenerCatalogo({ limit: 24 })
      .then((resultado) => {
        if (!vigente) return;
        setProductos(resultado.productos);
        setFuenteCatalogo(resultado.fuente);
        // Sin API propia no existe /categorias: derivamos una lista temporal de
        // Fake Store con el mismo contrato (sin subcategorías).
        if (resultado.fuente === "fallback") {
          const conteos = new Map();
          resultado.productos.forEach((producto) => {
            const existente = conteos.get(producto.categoriaSlug);
            conteos.set(producto.categoriaSlug, {
              id: existente?.id ?? producto.categoriaSlug,
              nombre: producto.categoria,
              slug: producto.categoriaSlug,
              productCount: (existente?.productCount ?? 0) + 1,
            });
          });
          setCategoriasDisponibles([...conteos.values()]);
        }
        setError(null);
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar el catálogo. Revisa tu conexión e intenta de nuevo.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [esAdmin, reintento]);

  // Ofertas destacadas del Home (solo con API propia). Independiente de la base.
  useEffect(() => {
    if (esAdmin || fuenteCatalogo !== "api") return undefined;
    let vigente = true;
    obtenerCatalogo({ soloOfertas: true, limit: 3 }).then((resultado) => {
      if (vigente && resultado.fuente === "api") {
        setOfertasDestacadas({ productos: resultado.productos, meta: resultado.meta });
      }
    });
    return () => {
      vigente = false;
    };
  }, [esAdmin, fuenteCatalogo]);

  // "Lo más vendido" del Home: ranking real de ventas (solo con API propia). Si
  // aún no hay ventas o la fuente cae a Fake Store, queda null y la fila se oculta.
  useEffect(() => {
    if (esAdmin || fuenteCatalogo !== "api") return undefined;
    let vigente = true;
    obtenerMasVendidos({ limit: 12 }).then((productos) => {
      if (vigente && productos?.length) setMasVendidos(productos);
    });
    return () => {
      vigente = false;
    };
  }, [esAdmin, fuenteCatalogo]);

  // React Router actualiza la URL, pero no desplaza automáticamente al hash.
  // Tras llegar a la sección limpiamos el hash: al recargar, la tienda vuelve
  // a iniciar desde el hero en vez de conservar la última sección visitada.
  useEffect(() => {
    if (cargando || !ubicacion.hash) return;

    const id = ubicacion.hash.slice(1);
    const cuadro = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      navegar(`${ubicacion.pathname}${ubicacion.search}`, { replace: true });
    });

    return () => cancelAnimationFrame(cuadro);
  }, [cargando, navegar, ubicacion.hash, ubicacion.pathname, ubicacion.search]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    setReintento((n) => n + 1);
  };

  // Las destacadas solo valen con API propia. Derivarlas aquí (en vez de
  // resetear el estado dentro del effect) evita un setState síncrono en el
  // effect y descarta datos obsoletos si la fuente vuelve al fallback.
  const ofertasDestacadasVigentes =
    fuenteCatalogo === "api" ? ofertasDestacadas : null;
  const esCheckout = ubicacion.pathname.startsWith("/checkout");
  const esEstadoPago = ubicacion.pathname.startsWith("/pago/");
  const esAcceso = ["/login", "/registro", "/recuperar-contrasena", "/recuperar"].includes(ubicacion.pathname);
  const esMiCuenta = ubicacion.pathname.startsWith("/mi-cuenta");
  const esPantallaPrivada = esAcceso || esMiCuenta || esEstadoPago;

  // Clave de remonte de PaginaCatalogo: solo el CONTEXTO (ruta + sub + nivel3 +
  // q). Los filtros del sidebar que viven en la URL (?atributos=) se excluyen a
  // propósito, para que marcar un atributo NO remonte la página ni borre las
  // marcas/precio/orden ya elegidos; ese filtro se aplica vía efecto, no remonte.
  const paramsUbicacion = new URLSearchParams(ubicacion.search);
  const claveCatalogo = `${ubicacion.pathname}|${paramsUbicacion.get("sub") ?? ""}|${paramsUbicacion.get("nivel3") ?? ""}|${paramsUbicacion.get("q") ?? ""}`;

  // El panel tiene su propia sesión y shell. Se resuelve antes que la carga de
  // la tienda pública para no depender del catálogo ni montar carrito/footer.
  if (esAdmin) {
    return (
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/resumen" replace />} />
        <Route path="/admin/acceso" element={<AdminAcceso />} />
        <Route path="/admin/recuperar-contrasena" element={<AdminRecuperarContrasena />} />
        <Route path="/admin/recuperar" element={<AdminRestablecerContrasena />} />
        <Route path="/admin/productos" element={<AdminProductos />} />
        <Route path="/admin/productos/nuevo" element={<AdminProductoEditor />} />
        <Route path="/admin/productos/:id/editar" element={<AdminProductoEditor />} />
        <Route path="/admin/pedidos" element={<AdminPedidos />} />
        <Route path="/admin/resumen" element={<AdminResumen />} />
        <Route path="/admin/cuenta" element={<AdminCuenta />} />
        <Route path="/admin/equipo" element={<AdminEquipo />} />
        <Route path="/admin/envios" element={<AdminEnvios />} />
        <Route path="/admin/clientes" element={<AdminClientes />} />
        <Route path="/admin/inventario" element={<AdminInventario />} />
        <Route path="/admin/identidad" element={<AdminIdentidad />} />
        <Route path="/admin/contenido" element={<AdminContenido />} />
        <Route path="/admin/banners" element={<AdminBanners />} />
        <Route path="/admin/categorias" element={<AdminCategorias />} />
        <Route path="/admin/marcas" element={<AdminMarcas />} />
        <Route path="/admin/*" element={<Navigate to="/admin/resumen" replace />} />
      </Routes>
    );
  }

  //early return
  if (cargando) {
    return (
      <div className={styles.app}>
        <div className={styles.cargando} role="status">
          <span className={styles.loader} aria-hidden="true"></span>
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.app}>
        <div className={styles.cargando} role="alert">
          <p>{error}</p>
          <button className={styles.reintentar} onClick={reintentar}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {!esCheckout && !esPantallaPrivada && (
        <Header
          categorias={categoriasDisponibles}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          onAbrirCarrito={() => setCarritoAbierto(true)}
          onAbrirAcceso={(modo = "login") => {
            setModoAcceso(modo);
            setAccesoAbierto(true);
          }}
        />
      )}

      {/* Contenido centrado: el Header y el Footer viven FUERA de este
          envoltorio para poder ir de borde a borde . */}
      <main
        className={`${styles.contenido} ${(esCheckout || esEstadoPago) ? styles.contenidoCheckout : ""} ${esAcceso ? styles.contenidoAcceso : ""} ${esMiCuenta ? styles.contenidoCuenta : ""}`}
      >
        <Routes>
          <Route
            path="/"
            element={
              <Home
                productos={productos}
                categorias={categoriasDisponibles}
                ofertasDestacadas={ofertasDestacadasVigentes}
                masVendidos={fuenteCatalogo === "api" ? masVendidos : null}
              />
            }
          />
          <Route
            path="/categoria/:slug"
            element={<PaginaCatalogo key={claveCatalogo} categorias={categoriasDisponibles} />}
          />
          <Route
            path="/catalogo"
            element={<PaginaCatalogo key={claveCatalogo} categorias={categoriasDisponibles} />}
          />
          <Route
            path="/ofertas"
            element={<PaginaCatalogo key={claveCatalogo} categorias={categoriasDisponibles} />}
          />
          <Route
            path="/buscar"
            element={<PaginaCatalogo key={claveCatalogo} categorias={categoriasDisponibles} />}
          />
          <Route
            path="/producto/:slug"
            element={<ProductoDetalle productos={productos} />}
          />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/pago" element={<CheckoutPago />} />
          <Route path="/pago/exito" element={<EstadoPago />} />
          <Route path="/pago/pendiente" element={<EstadoPago />} />
          <Route path="/pago/error" element={<EstadoPago />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
          <Route path="/recuperar" element={<RestablecerContrasena />} />
          <Route path="/newsletter/baja" element={<NewsletterBaja />} />
          <Route path="/nosotros" element={<PaginaContenido slug="nosotros" />} />
          <Route path="/terminos" element={<PaginaContenido slug="terminos" />} />
          <Route path="/privacidad" element={<PaginaContenido slug="privacidad" />} />
          <Route path="/faq" element={<PaginaContenido slug="faq" />} />
          <Route
            path="/mi-cuenta"
            element={
              <RutaProtegida>
                <MiCuenta />
              </RutaProtegida>
            }
          />
          <Route
            path="/mi-cuenta/pedidos"
            element={
              <RutaProtegida>
                <MisPedidos />
              </RutaProtegida>
            }
          />
          <Route
            path="/mi-cuenta/pedidos/:id"
            element={
              <RutaProtegida>
                <DetallePedido />
              </RutaProtegida>
            }
          />
          <Route
            path="/mi-cuenta/datos"
            element={
              <RutaProtegida>
                <DatosCuenta />
              </RutaProtegida>
            }
          />
        </Routes>
      </main>

      {/* El overlay Si es condicional: aparece solo cuando el carrito está abierto */}
      {carritoAbierto && (
        <div
          className={styles.overlay}
          onClick={() => setCarritoAbierto(false)}
        ></div>
      )}

      {accesoAbierto && (
        <ModalAcceso
          modoInicial={modoAcceso}
          alCerrar={() => setAccesoAbierto(false)}
        />
      )}

      {/* El Carrito SIEMPRE montado: se desliza dentro/fuera según "abierto" */}
      <Carrito
        onCerrar={() => setCarritoAbierto(false)}
        abierto={carritoAbierto}
        productos={productos}
      />

      {/* Los avisos normales siguen flotando siempre. Al borrar dentro del
          drawer, solo el aviso con "Deshacer" se mueve al carrito. */}
      <Toast ocultarSiAccion={carritoAbierto} />

      {!esCheckout && !esPantallaPrivada && (
        <Footer
          productos={productos}
          onAbrirAcceso={(modo = "login") => {
            setModoAcceso(modo);
            setAccesoAbierto(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
