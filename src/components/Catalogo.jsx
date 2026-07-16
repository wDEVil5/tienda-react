import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";
import styles from "../Catalogo.module.css";

const LIMITE_CATEGORIAS_VISIBLES = 6;

function Catalogo({ productos, busqueda, onAgregar }) {
  const [categoria, setCategoria] = useState("todas"); // la categoria elegida
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [masCategoriasAbierto, setMasCategoriasAbierto] = useState(false);

  //const categorias = ["todas", "frutas", "lacteos", ...]; //datos fijos MANUAL
  const categorias = ["todas", ...new Set(productos.map((p) => p.categoria))]; // version Derivada, calculo automatico
  const categoriasVisibles = categorias.slice(0, LIMITE_CATEGORIAS_VISIBLES);
  const categoriasExtra = categorias.slice(LIMITE_CATEGORIAS_VISIBLES);

  const seleccionarCategoria = (cat) => {
    setCategoria(cat);
    setFiltrosAbiertos(false);
    setMasCategoriasAbierto(false);
  };

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

        <div className={styles.filtrosEscritorio}>
          {categoriasVisibles.map((cat) => (
            <button
              key={cat}
              onClick={() => seleccionarCategoria(cat)}
              className={categoria === cat ? styles.filtroActivo : styles.filtro}
            >
              {cat}
            </button>
          ))}

          {categoriasExtra.length > 0 && (
            <div className={styles.masCategorias}>
              <button
                className={styles.verMas}
                type="button"
                onClick={() => setMasCategoriasAbierto(!masCategoriasAbierto)}
                aria-expanded={masCategoriasAbierto}
                aria-controls="categorias-extra"
              >
                Explorar {categoriasExtra.length} más
                <i className={`fa-solid ${masCategoriasAbierto ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
              </button>

              {masCategoriasAbierto && (
                <div id="categorias-extra" className={styles.listaExtra}>
                  {categoriasExtra.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => seleccionarCategoria(cat)}
                      className={categoria === cat ? styles.filtroActivo : styles.filtro}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          id="lista-categorias"
          className={`${styles.filtrosMovil} ${filtrosAbiertos ? styles.filtrosAbiertos : ""}`}
        >
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => seleccionarCategoria(cat)}
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
