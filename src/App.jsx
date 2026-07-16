import { useState, useEffect } from "react";
//import { productos } from "./data/producto.js"; ya no la uso porque estoy usando datos de la API
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
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [carrito, setCarrito] = useState(() => {
    const guardado = localStorage.getItem("carrito");
    return guardado ? JSON.parse(guardado) : [];
  });
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const totalItems = carrito.reduce((suma, item) => suma + item.cantidad, 0);

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
          precioAnterior: null,
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

  //Guardar: cada vez que el carrito cambie
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

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

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find((item) => item.id === producto.id);

    if (itemExistente) {
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        ),
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(
      carrito.map((item) =>
        item.id === id
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item,
      ),
    );
  };

  return (
    <div className={styles.app}>
      <Header
        busqueda={busqueda}
        onBuscar={setBusqueda}
        totalItems={totalItems}
        onAbrirCarrito={() => setCarritoAbierto(true)}
        onToggleMenu={() => setMenuAbierto((prev) => !prev)}
      />

      <Catalogo
        productos={productos}
        busqueda={busqueda}
        onAgregar={agregarAlCarrito}
        menuAbierto={menuAbierto}
        onCerrarMenu={() => setMenuAbierto(false)}
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
