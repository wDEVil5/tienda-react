import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import Checkout from "./pages/Checkout.jsx";
import { Login, Registro } from "./pages/Acceso.jsx";
import MiCuenta from "./pages/MiCuenta.jsx";
import MisPedidos from "./pages/MisPedidos.jsx";
import Carrito from "./components/Carrito.jsx";
import Toast from "./components/Toast.jsx";
import styles from "./App.module.css";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import { obtenerCatalogo, obtenerCategorias } from "./services/productosApi.js";

const PRODUCTOS_POR_PAGINA = 10;

function App() {
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  // Header y catálogo comparten estos filtros: una sugerencia puede cambiar la
  // categoría y el catálogo la refleja sin depender de un backend todavía.
  const [categoria, setCategoria] = useState("todas");
  const [soloOfertas, setSoloOfertas] = useState(false);
  const [orden, setOrden] = useState("relevancia");
  const [precioMin, setPrecioMin] = useState(null);
  const [precioMax, setPrecioMax] = useState(null);
  const [productos, setProductos] = useState([]); // base: hero, detalle, sugerencias y footer
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [productosCatalogo, setProductosCatalogo] = useState([]); // resultado de la consulta actual
  const [metaCatalogo, setMetaCatalogo] = useState(null);
  const [fuenteCatalogo, setFuenteCatalogo] = useState(null);
  const [ofertasDestacadas, setOfertasDestacadas] = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [cargando, setCargando] = useState(true); // ¿esta cargando?
  const [error, setError] = useState(null); // null = sin error, string = mensaje a mostrar

  const [carritoAbierto, setCarritoAbierto] = useState(false);

  // La búsqueda espera un instante antes de consultar. Esto evita una petición
  // por cada tecla y mantiene la respuesta del servidor como fuente de verdad.
  const [busquedaParaApi, setBusquedaParaApi] = useState("");
  useEffect(() => {
    const espera = window.setTimeout(() => {
      setBusquedaParaApi(busqueda);
    }, 250);

    return () => window.clearTimeout(espera);
  }, [busqueda]);

  useEffect(() => {
    obtenerCategorias().then((categorias) => {
      if (categorias) setCategoriasDisponibles(categorias);
    });
  }, []);

  useEffect(() => {
    // Sin API propia no hay sección editorial: no consultamos ni tocamos el
    // estado aquí. La versión mostrada se deriva en render (ver más abajo), así
    // el effect solo asigna estado en el camino asíncrono del .then().
    if (fuenteCatalogo !== "api") return undefined;

    let vigente = true;

    // Esta consulta editorial es independiente de los filtros del catálogo.
    // Solo corre con API propia: la demo conserva la derivación de Fake Store.
    obtenerCatalogo({ soloOfertas: true, limit: 3 }).then((resultado) => {
      if (vigente && resultado.fuente === "api") {
        setOfertasDestacadas({
          productos: resultado.productos,
          meta: resultado.meta,
        });
      }
    });

    return () => {
      vigente = false;
    };
  }, [fuenteCatalogo]);

  // La interfaz muestra el nombre, pero la API filtra con el slug estable. No
  // derivamos el slug desde el texto: lo conservamos en el contrato de datos.
  const categoriaParaApi =
    categoria === "todas"
      ? undefined
      : categoriasDisponibles.find((categoriaActual) => categoriaActual.nombre === categoria)
          ?.slug ??
        productos.find((producto) => producto.categoria === categoria)?.categoriaSlug;

  const cargarProductos = useCallback(({ page = 1, agregar = false } = {}) => {
    obtenerCatalogo({
      orden,
      busqueda: busquedaParaApi,
      categoria: categoriaParaApi,
      soloOfertas,
      precioMin,
      precioMax,
      page,
      limit: PRODUCTOS_POR_PAGINA,
    })
      .then((resultado) => {
        setProductosCatalogo((actuales) =>
          agregar ? [...actuales, ...resultado.productos] : resultado.productos,
        );
        setMetaCatalogo(resultado.meta);
        setFuenteCatalogo(resultado.fuente);

        // En GitHub Pages no existe /categorias. Fake Store llega completo, por
        // lo que podemos conservar una lista temporal con el mismo contrato.
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

        // El Home conserva una base independiente. Acumulamos los productos ya
        // vistos para que un enlace de la página 2 siga encontrando su ficha.
        setProductos((actuales) => {
          const porId = new Map(actuales.map((producto) => [producto.id, producto]));
          resultado.productos.forEach((producto) => porId.set(producto.id, producto));
          return [...porId.values()];
        });
      })
      .catch(() => {
        setError("No se pudo cargar el catálogo. Revisa tu conexión e intenta de nuevo.");
      })
      .finally(() => {
        setCargando(false);
        setCargandoMas(false);
      });
  }, [
    busquedaParaApi,
    categoriaParaApi,
    orden,
    soloOfertas,
    precioMin,
    precioMax,
  ]);

  useEffect(() => {
    // Si el usuario aún está escribiendo, esperamos al término diferido. Así
    // no combinamos una categoría nueva con la búsqueda anterior por 250 ms.
    if (busqueda !== busquedaParaApi) return;

    cargarProductos();
  }, [busqueda, busquedaParaApi, cargarProductos]);

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
    cargarProductos();
  };

  const cargarMasProductos = () => {
    if (!metaCatalogo || cargandoMas || metaCatalogo.page >= metaCatalogo.totalPages) {
      return;
    }

    setCargandoMas(true);
    cargarProductos({ page: metaCatalogo.page + 1, agregar: true });
  };

  // Accesos globales: todos los CTA que hablan de ofertas aplican el mismo
  // filtro real. Así no depende de qué sección originó la navegación.
  const verOfertas = () => {
    setBusqueda("");
    setCategoria("todas");
    setSoloOfertas(true);
  };

  const verCatalogo = () => {
    setBusqueda("");
    setCategoria("todas");
    setSoloOfertas(false);
  };

  // Las destacadas solo valen con API propia. Derivarlas aquí (en vez de
  // resetear el estado dentro del effect) evita un setState síncrono en el
  // effect y descarta datos obsoletos si la fuente vuelve al fallback.
  const ofertasDestacadasVigentes =
    fuenteCatalogo === "api" ? ofertasDestacadas : null;
  const esCheckout = ubicacion.pathname === "/checkout";
  const esAcceso = ["/login", "/registro"].includes(ubicacion.pathname);
  const esMiCuenta = ubicacion.pathname.startsWith("/mi-cuenta");
  const esPantallaPrivada = esAcceso || esMiCuenta;

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
          busqueda={busqueda}
          onBuscar={setBusqueda}
          productos={productos}
          onSeleccionarCategoria={setCategoria}
          onCambiarSoloOfertas={setSoloOfertas}
          onVerOfertas={verOfertas}
          onVerCatalogo={verCatalogo}
          onAbrirCarrito={() => setCarritoAbierto(true)}
        />
      )}

      {/* Contenido centrado: el Header y el Footer viven FUERA de este
          envoltorio para poder ir de borde a borde . */}
      <main
        className={`${styles.contenido} ${esCheckout ? styles.contenidoCheckout : ""} ${esAcceso ? styles.contenidoAcceso : ""} ${esMiCuenta ? styles.contenidoCuenta : ""}`}
      >
        <Routes>
          <Route
            path="/"
            element={
              <Home
                productos={productos}
                busqueda={busqueda}
                onBuscar={setBusqueda}
                categoria={categoria}
                onSeleccionarCategoria={setCategoria}
                soloOfertas={soloOfertas}
                onCambiarSoloOfertas={setSoloOfertas}
                precioMin={precioMin}
                precioMax={precioMax}
                onCambiarPrecioMin={setPrecioMin}
                onCambiarPrecioMax={setPrecioMax}
                orden={orden}
                onOrdenar={setOrden}
                productosCatalogo={productosCatalogo}
                categorias={categoriasDisponibles}
                metaCatalogo={metaCatalogo}
                ofertasDestacadas={ofertasDestacadasVigentes}
                usaPaginacionServidor={fuenteCatalogo === "api"}
                cargandoMas={cargandoMas}
                onCargarMas={cargarMasProductos}
                onVerOfertas={verOfertas}
                onVerCatalogo={verCatalogo}
              />
            }
          />
          <Route
            path="/producto/:slug"
            element={<ProductoDetalle productos={productos} />}
          />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
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
        </Routes>
      </main>

      {/* El overlay Si es condicional: aparece solo cuando el carrito está abierto */}
      {carritoAbierto && (
        <div
          className={styles.overlay}
          onClick={() => setCarritoAbierto(false)}
        ></div>
      )}

      {/* El Carrito SIEMPRE montado: se desliza dentro/fuera según "abierto" */}
      <Carrito
        onCerrar={() => setCarritoAbierto(false)}
        abierto={carritoAbierto}
        productos={productos}
        onVerOfertas={verOfertas}
        onVerCatalogo={verCatalogo}
      />

      {/* Los avisos normales siguen flotando siempre. Al borrar dentro del
          drawer, solo el aviso con "Deshacer" se mueve al carrito. */}
      <Toast ocultarSiAccion={carritoAbierto} />

      {!esCheckout && !esPantallaPrivada && (
        <Footer
          productos={productos}
          onBuscar={setBusqueda}
          onSeleccionarCategoria={setCategoria}
          onCambiarSoloOfertas={setSoloOfertas}
          onVerOfertas={verOfertas}
          onVerCatalogo={verCatalogo}
        />
      )}
    </div>
  );
}

export default App;
