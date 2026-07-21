import { useState, useEffect } from "react";
import { useCarrito } from "./hooks/useCarrito.js";
import Catalogo from "./components/Catalogo.jsx";
import Carrito from "./components/Carrito.jsx";
import styles from "./App.module.css";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]); //empieza vacia, los datos llegan despues
  const [cargando, setCargando] = useState(true); // ¿esta cargando?
  const [error, setError] = useState(null); // null = sin error, string = mensaje a mostrar

  // toda la lógica del carrito vive ahora en el custom hook useCarrito.
  const {
    carrito,
    totalItems,
    agregarAlCarrito,
    eliminarDelCarrito,
    cambiarCantidad,
  } = useCarrito();
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
        const traducidos = datos.map((p) => ({
          id: p.id,
          nombre: p.title,
          precio: p.price,
          imagen: p.image,
          categoria: p.category,
          // La API no trae ofertas. Simulare una en los productos de id pares:
          // un precio anterior 25% más alto, para mostrar el badge "Oferta" y el
          // precio tachado. En la fase 2 (backend propio) esto será dato real
          precioAnterior:
            p.id % 2 === 0 ? Math.round(p.price * 1.25 * 100) / 100 : null,
        }));
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

  const reintentar = () => {
    setCargando(true);
    setError(null);
    cargarProductos();
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
        totalItems={totalItems}
        onAbrirCarrito={() => setCarritoAbierto(true)}
      />

      <Catalogo
        productos={productos}
        busqueda={busqueda}
        onAgregar={agregarAlCarrito}
      />

      {/* El overlay Si es condicional: aparece solo cuando el carrito está abierto */}
      {carritoAbierto && (
        <div
          className={styles.overlay}
          onClick={() => setCarritoAbierto(false)}
        ></div>
      )}

      {/* El Carrito SIEMPRE montado: se desliza dentro/fuera según "abierto" */}
      <Carrito
        carrito={carrito}
        onEliminar={eliminarDelCarrito}
        onCambiarCantidad={cambiarCantidad}
        onCerrar={() => setCarritoAbierto(false)}
        abierto={carritoAbierto}
      />

      <Footer />
    </div>
  );
}

export default App;
