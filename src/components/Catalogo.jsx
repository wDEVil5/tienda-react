import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";
import styles from "../Catalogo.module.css";

function Catalogo({ productos, busqueda, onAgregar }) {
  const [categoria, setCategoria] = useState("todas"); // la categoria elegida
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  //const categorias = ["todas", "frutas", "lacteos", ...]; //datos fijos MANUAL
  const categorias = ["todas", ...new Set(productos.map((p) => p.categoria))]; // version Derivada, calculo automatico

  const productosFiltrados = productos.filter((producto) => {
    const coincideBusqueda = producto.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoria === "todas" || producto.categoria === categoria;

    //veredicto
    return coincideBusqueda && coincideCategoria;
  });

  return (
    <section id="catalogo" className={styles.catalogo}>
      <div className={styles.controles}>
        {/* Botones de categoria */}
        <button
          className={styles.selectorCategoria}
          type="button"
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          aria-expanded={filtrosAbiertos}
          aria-controls="lista-categorias"
        >
          <span>Categoría: {categoria}</span>
          <i className={`fa-solid ${filtrosAbiertos ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
        </button>

        <div
          id="lista-categorias"
          className={`${styles.filtros} ${filtrosAbiertos ? styles.filtrosAbiertos : ""}`}
        >
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoria(cat);
                setFiltrosAbiertos(false);
              }}
              className={
                categoria === cat ? styles.filtroActivo : styles.filtro
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {productosFiltrados.map((producto) => (
          <TarjetaProducto
            key={producto.id}
            producto={producto}
            onAgregar={onAgregar}
          />
        ))}
      </div>
    </section>
  );
}

export default Catalogo;
