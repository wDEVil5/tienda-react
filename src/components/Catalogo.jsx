import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";


function Catalogo({ productos }) {

    //estados
    const [busqueda, setBusqueda] = useState(""); // lo que escribio el usuario
    const [categoria, setCategoria] = useState("todas");

    //calculo derivado
    const productosFiltrados = productos.filter((producto) => {
        const coincideBusqueda = producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());

    const coincideCategoria = categoria === "todas" || producto.categoria === categoria;

    return coincideBusqueda && coincideCategoria;
    });

    return (
        <section>
            <input
                type="text"
                placeholder="Buscar producto"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
            />

            {/* Botones de Categoria */}
            <button onClick={() => setCategoria("todas")}>todas</button>
            <button onClick={() => setCategoria("frutas")}>frutas</button>
            <button onClick={() => setCategoria("lacteos")}>lacteos</button>
            <button onClick={() => setCategoria("abarrotes")}>abarrotes</button>
            <button onClick={() => setCategoria("bebidas")}>bebidas</button>
            <button onClick={() => setCategoria("snacks")}>snacks</button>
            <button onClick={() => setCategoria("limpieza")}>limpieza</button>

            {productosFiltrados.map((producto) => (
                <TarjetaProducto key = {producto.id} producto = {producto}/>
            ))}
        </section>
    );
}

export default Catalogo;
