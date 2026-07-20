import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";
import styles from "../Catalogo.module.css";

const LIMITE_CATEGORIAS_VISIBLES = 6;
// Por ahora la API entrega todos los productos. Con un backend propio, este límite
// debería enviarse a la API, por ejemplo: /productos?page=1&limit=12.
const PRODUCTOS_POR_CARGA = 12;

function Catalogo({ productos, busqueda, onAgregar }) {
  const [categoria, setCategoria] = useState("todas"); // la categoria elegida
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [masCategoriasAbierto, setMasCategoriasAbierto] = useState(false);
  const [limiteProductos, setLimiteProductos] = useState(PRODUCTOS_POR_CARGA);

  //const categorias = ["todas", "frutas", "lacteos", ...]; //datos fijos MANUAL,
  const categorias = ["todas", ...new Set(productos.map((p) => p.categoria))]; // version Derivada, calculo automatico
  const categoriasVisibles = categorias.slice(0, LIMITE_CATEGORIAS_VISIBLES);
  const categoriasExtra = categorias.slice(LIMITE_CATEGORIAS_VISIBLES);

  const seleccionarCategoria = (cat) => {
    setCategoria(cat);
    setFiltrosAbiertos(false);
    setMasCategoriasAbierto(false);
  };

  // Cuando cambian los filtros (búsqueda o categoría), volvemos a la primera "tanda"
  // de productos. Patrón recomendado por React: ajustar el estado durante el render
  // comparando con el valor anterior, en vez de un useEffect (que dispara render extra).
  const [filtrosPrevios, setFiltrosPrevios] = useState({ busqueda, categoria });
  if (
    filtrosPrevios.busqueda !== busqueda ||
    filtrosPrevios.categoria !== categoria
  ) {
    setFiltrosPrevios({ busqueda, categoria });
    setLimiteProductos(PRODUCTOS_POR_CARGA);
  }

  const productosFiltrados = productos.filter((producto) => {
    const coincideBusqueda = producto.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoria === "todas" || producto.categoria === categoria;

    //veredicto
    return coincideBusqueda && coincideCategoria;
  });

  const productosVisibles = productosFiltrados.slice(0, limiteProductos);
  const hayMasProductos = limiteProductos < productosFiltrados.length;
  const productosRestantes = productosFiltrados.length - limiteProductos;

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

      {productosFiltrados.length === 0 ? (
        <p className={styles.sinResultados}>
          Sorry! no encontramos productos que coincidan con tu búsqueda.
        </p>
      ) : (
        <>
          <div className={styles.grid}>
            {productosVisibles.map((producto) => (
              <TarjetaProducto
                key={producto.id}
                producto={producto}
                onAgregar={onAgregar}
              />
            ))}
          </div>

          {hayMasProductos && (
            <div className={styles.cargarMasWrap}>
              <button
                className={styles.cargarMas}
                type="button"
                onClick={() => setLimiteProductos((limite) => limite + PRODUCTOS_POR_CARGA)}
              >
                Cargar {Math.min(PRODUCTOS_POR_CARGA, productosRestantes)} productos más
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default Catalogo;
