import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";
import styles from "../Catalogo.module.css";


function Catalogo({ productos, busqueda, onAgregar }) {

    const [categoria, setCategoria] = useState("todas"); // la ctegoria elegida

    //const categorias = ["todas", "frutas", "lacteos", "abarrotes", "bebidas", "snacks", "limpieza"]; //datos fijos MANUAL
    const categorias = ["todas", ...new Set(productos.map((p) => p.categoria))]; // version Derivada, calculo automatico

    const productosFiltrados = productos.filter((producto) => {
        const coincideBusqueda = producto.nombre
            .toLowerCase()
            .includes(busqueda.toLocaleLowerCase());

        const coincideCategoria = categoria === "todas" || producto.categoria === categoria;


        //veredicto
        return coincideBusqueda && coincideCategoria;

    
    });
    
    return (
        
        <section className={styles.catalogo}>
            <div className={styles.controles}>

                {/* Botones de categoria */}
                <div className={styles.filtros}>
                    {categorias.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategoria(cat)}
                            className={categoria === cat ? styles.filtroActivo : styles.filtro}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            
            
            <div className={styles.grid}>
                {productosFiltrados.map((producto) => (
                <TarjetaProducto 
                    key = {producto.id} 
                    producto = {producto} 
                    onAgregar = {onAgregar}
                    />
                ))}
            </div>
  
        </section>
    );
}

export default Catalogo;
