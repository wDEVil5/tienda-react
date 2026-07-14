import { useState } from "react";
import { productos } from "./data/producto.js";
import Catalogo from "./components/Catalogo.jsx";
import Carrito from "./components/Carrito.jsx";

function App() {

    const [carrito, setCarrito] = useState([])

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

    const eliminarDelCarrito = (id) => {
        setCarrito(carrito.filter((item) => item.id !== id));
    };
    

    return (
        <div>
            <h1>SumarketExpress</h1>
            <Catalogo productos = {productos} onAgregar = {agregarAlCarrito} />
            <Carrito carrito = {carrito} onEliminar = {eliminarDelCarrito}/>
            
        </div>
    )
}

export default App;
