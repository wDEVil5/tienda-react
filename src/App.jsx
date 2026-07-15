import { useState, useEffect } from "react";
//import { productos } from "./data/producto.js"; ya no la uso porque estoy usando datos de la API
import Catalogo from "./components/Catalogo.jsx";
import Carrito from "./components/Carrito.jsx";
import styles from "./App.module.css";

function App() {
    const [productos, setProductos] = useState([]) //empieza vacia, los datos llegan despues
    const [cargando, setCargando] = useState(true) // ¿esta cargando? muestra un mensaje si esta en true...mientras llega la respuesta

    const [carrito, setCarrito] = useState(() => {
        const guardado = localStorage.getItem("carrito");
        return guardado ? JSON.parse(guardado) : [];
    })

    useEffect(() => {
        fetch("https://fakestoreapi.com/products") //API datos ficticio
        .then((respuesta) => respuesta.json()) //alternativa async/await
        .then((datos) => {
            const traducidos = datos.map((p) => ({ // traducir los datos de la API, para que se adapten
                id: p.id,
                nombre: p.title,
                precio: p.price,
                imagen: p.image,
                categoria: p.category,
                precioAnterior: null
            }));
            setProductos(traducidos); //guarda los productos pero ya traducidos traducidos
            setCargando(false); //una vez este los datos apaga el "Cargando..."
        });
    }, []); // [] carga una vez y lito


    //Guardar: cada vez que el carrito cambie
    useEffect(() => {
        localStorage.setItem("carrito", JSON.stringify(carrito));
    }, [carrito])

    //early return
    if (cargando) {
        return <p>Cargando productos...</p>;
    }

    const agregarAlCarrito = (producto) => {
        const itemExistente = carrito.find((item) => item.id === producto.id);

        if (itemExistente) {
            //si ya esta: recorro el carrito y le agrego uno SOLO al que coincide
                setCarrito (
                    carrito.map((item) => 
                    item.id === producto.id
                    ? {...item, cantidad: item.cantidad + 1 }
                    : item
                )
            );
        } else {
            //si no esta: creo un archivo nuevo con todos los items + este, con cantidad 1
            setCarrito([...carrito, {...producto, cantidad: 1}]);
        }
    };

    const eliminarDelCarrito = ( id ) => {
        setCarrito(carrito.filter((item) => item.id !== id));
    };
    
    const cambiarCantidad = (id, delta) => {
        setCarrito(

            //Math.max(a, b) devuelve el mayor de los dos valores.
            //Math.max(1, item.cantidad + delta) significa:
            //"usa el resultado de sumar el delta, pero nunca menos de 1".
            carrito.map((item) => 
            item.id === id
                ? {...item, cantidad: Math.max(1, item.cantidad + delta) }
                : item
                
            )
        );
    };

    return (
        <div className={styles.app}>
            <h1 className={styles.titulo}>SumarketExpress</h1>
            <div className={styles.layout}>
                <Catalogo 
                    productos = {productos} 
                    onAgregar = {agregarAlCarrito} />
                <Carrito 
                    carrito = {carrito} 
                    onEliminar = {eliminarDelCarrito} 
                    onCambiarCantidad={cambiarCantidad}/>     
            </div>
        </div>
    )
}

export default App;
