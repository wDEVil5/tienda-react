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

  const [carrito, setCarrito] = useState(() => {
    const guardado = localStorage.getItem("carrito");
    return guardado ? JSON.parse(guardado) : [];
  });
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const totalItems = carrito.reduce((suma, item) => suma + item.cantidad, 0);

  useEffect(() => {
    fetch("https://fakestoreapi.com/products")
      .then((respuesta) => respuesta.json())
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
        setCargando(false);
      });
  }, []);

  //Guardar: cada vez que el carrito cambie
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  //early return
  if (cargando) {
    return <p>Cargando productos...</p>;
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
      />

      <Catalogo
        productos={productos}
        busqueda={busqueda}
        onAgregar={agregarAlCarrito}
      />

      {/* El overlay SÍ es condicional: aparece solo cuando el carrito está abierto */}
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
