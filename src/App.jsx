import { useState } from "react";
import { productos } from "./data/producto.js";
import Catalogo from "./components/Catalogo.jsx";

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
    

    return (
        <div>
            <h1>SumarketExpress</h1>
            <Catalogo productos = {productos} onAgregar = {agregarAlCarrito} />
            <p>Items en el carrito: {carrito.length}</p>
        </div>
    )
}

export default App;
