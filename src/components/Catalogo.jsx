import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";


function Catalogo({ productos, onAgregar }) {

    const [busqueda, setBusqueda] = useState(""); // lo que escribe el usuario
    const [categoria, setCategoria] = useState("todas"); // la ctegoria elegida

    const categorias = ["todas", "frutas", "lacteos", "abarrotes", "bebidas", "snacks", "limpieza"];

    const productosFiltrados = productos.filter((producto) => {
        const coincideBusqueda = producto.nombre
            .toLowerCase()
            .includes(busqueda.toLocaleLowerCase());

        const coincideCategoria = categoria === "todas" || producto.categoria === categoria;


        //veredicto
        return coincideBusqueda && coincideCategoria;

    
    });
    
    return (
        <section>
            <input
                type="text"
                value={busqueda}
                placeholder="Buscar producto"
                onChange={(e) => setBusqueda(e.target.value)}
            />

            {/* Botones de categoria */}
            <div>
                {categorias.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setCategoria(cat)}
                        className={categoria === cat ? "activo" : ""}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            

            {productosFiltrados.map((producto) => (
                <TarjetaProducto key = {producto.id} producto = {producto} onAgregar = {onAgregar}/>

            ))}
        </section>
    );
}

export default Catalogo;
