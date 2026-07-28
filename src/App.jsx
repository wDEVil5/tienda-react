import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import Carrito from "./components/Carrito.jsx";
import Toast from "./components/Toast.jsx";
import styles from "./App.module.css";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import { normalizarProductoFakeStore } from "./data/producto.js";

function App() {
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  // Header y catálogo comparten estos filtros: una sugerencia puede cambiar la
  // categoría y el catálogo la refleja sin depender de un backend todavía.
  const [categoria, setCategoria] = useState("todas");
  const [soloOfertas, setSoloOfertas] = useState(false);
  const [productos, setProductos] = useState([]); //empieza vacia, los datos llegan despues
  const [cargando, setCargando] = useState(true); // ¿esta cargando?
  const [error, setError] = useState(null); // null = sin error, string = mensaje a mostrar

  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const cargarProductos = () => {
    fetch("https://fakestoreapi.com/products")
      .then((respuesta) => {
        if (!respuesta.ok) {
          // fetch no rechaza por errores HTTP (404, 500..), tengo que revisarlo yo (manual)
          throw new Error("El servidor respondió con un error.");
        }
        return respuesta.json();
      })
      .then((datos) => {
        // La UI solo conoce el contrato de datos; la traducción vive en un solo
        // lugar (src/data/producto.js). Cambiar de fuente = cambiar de normalizador.
        const traducidos = datos.map(normalizarProductoFakeStore);
        setProductos(traducidos);
      })
      .catch(() => {
        setError("No se pudo cargar el catálogo. Revisa tu conexión e intenta de nuevo.");
      })
      .finally(() => {
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarProductos();
  }, []);

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

      {/* Contenido centrado: el Header y el Footer viven FUERA de este
          envoltorio para poder ir de borde a borde . */}
      <main className={styles.contenido}>
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
                onVerOfertas={verOfertas}
                onVerCatalogo={verCatalogo}
              />
            }
          />
          <Route
            path="/producto/:id"
            element={<ProductoDetalle productos={productos} />}
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

      {/* Aviso flotante que aparece al agregar y se va solo */}
      <Toast />

      <Footer
        productos={productos}
        onBuscar={setBusqueda}
        onSeleccionarCategoria={setCategoria}
        onCambiarSoloOfertas={setSoloOfertas}
        onVerOfertas={verOfertas}
        onVerCatalogo={verCatalogo}
      />
    </div>
  );
}

export default App;
