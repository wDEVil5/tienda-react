import { useState } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";
import styles from "../Catalogo.module.css";

const LIMITE_CATEGORIAS_VISIBLES = 6;
// Por ahora la API entrega todos los productos. Con un backend propio, este límite
// debería enviarse a la API, por ejemplo: /productos?page=1&limit=12.
const PRODUCTOS_POR_CARGA = 12;

function Catalogo({ productos, busqueda }) {
  const [categoria, setCategoria] = useState("todas"); // la categoria elegida
  const [masCategoriasAbierto, setMasCategoriasAbierto] = useState(false);
  const [limiteProductos, setLimiteProductos] = useState(PRODUCTOS_POR_CARGA);
  const [orden, setOrden] = useState("relevancia"); // criterio de ordenamiento
  const [soloOfertas, setSoloOfertas] = useState(false); // filtrar solo ofertas


  const categorias = ["todas", ...new Set(productos.map((p) => p.categoria))]; // version Derivada, calculo automatico
  const categoriasVisibles = categorias.slice(0, LIMITE_CATEGORIAS_VISIBLES);
  const categoriasExtra = categorias.slice(LIMITE_CATEGORIAS_VISIBLES);

  // Conteo de productos por categoría (derivado) para el número de cada chip.
  const conteos = productos.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] || 0) + 1;
    return acc;
  }, {});
  const contarCategoria = (cat) =>
    cat === "todas" ? productos.length : conteos[cat] ?? 0;

  const seleccionarCategoria = (cat) => {
    setCategoria(cat);
    setMasCategoriasAbierto(false);
  };

  // Cuando cambian los filtros (búsqueda, categoría u ofertas), volvemos a la
  // primera "tanda" de productos. Patrón recomendado por React: ajustar el estado
  // durante el render comparando con el valor anterior, en vez de un useEffect.
  const [filtrosPrevios, setFiltrosPrevios] = useState({
    busqueda,
    categoria,
    soloOfertas,
  });
  if (
    filtrosPrevios.busqueda !== busqueda ||
    filtrosPrevios.categoria !== categoria ||
    filtrosPrevios.soloOfertas !== soloOfertas
  ) {
    setFiltrosPrevios({ busqueda, categoria, soloOfertas });
    setLimiteProductos(PRODUCTOS_POR_CARGA);
  }

  const productosFiltrados = productos.filter((producto) => {
    const coincideBusqueda = producto.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoria === "todas" || producto.categoria === categoria;

    const coincideOferta = !soloOfertas || producto.precioAnterior !== null;

    //veredicto
    return coincideBusqueda && coincideCategoria && coincideOferta;
  });

  // Ordenamiento derivado. .sort() MUTA el array, así que copiamos primero con
  // [...] para no alterar productosFiltrados (ni, por ende, la prop productos).
  // "relevancia" deja el orden original que entrega la API.
  const productosOrdenados = [...productosFiltrados];
  if (orden === "precio-asc") {
    productosOrdenados.sort((a, b) => a.precio - b.precio);
  } else if (orden === "precio-desc") {
    productosOrdenados.sort((a, b) => b.precio - a.precio);
  } else if (orden === "alfabetico") {
    // localeCompare ordena texto respetando acentos y mayúsculas del idioma.
    productosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  const productosVisibles = productosOrdenados.slice(0, limiteProductos);
  const hayMasProductos = limiteProductos < productosFiltrados.length;

  return (
    <section id="catalogo" className={styles.catalogo}>
      <div className={styles.encabezado}>
        <div>
          <h2 className={styles.titulo}>Todo el catálogo</h2>
          <p className={styles.subtitulo}>
            {productosFiltrados.length} productos · precios de hoy
          </p>
        </div>

        <div className={styles.barraOrden}>
          <label htmlFor="orden" className={styles.ordenLabel}>
            Ordenar
          </label>
          <select
            id="orden"
            className={styles.ordenSelect}
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
          >
            <option value="relevancia">Relevancia</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="alfabetico">Nombre: A - Z</option>
          </select>
        </div>
      </div>

      <div className={styles.controles}>
        <div className={styles.chips}>
          {categoriasVisibles.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => seleccionarCategoria(cat)}
              className={`${styles.chip} ${categoria === cat ? styles.chipActivo : ""}`}
            >
              {cat}
              <span className={styles.conteo}>{contarCategoria(cat)}</span>
            </button>
          ))}

          {categoriasExtra.length > 0 && (
            <div className={styles.masCategorias}>
              <button
                className={styles.chip}
                type="button"
                onClick={() => setMasCategoriasAbierto(!masCategoriasAbierto)}
                aria-expanded={masCategoriasAbierto}
                aria-controls="categorias-extra"
              >
                {categoriasExtra.length} más
                <i
                  className={`fa-solid ${masCategoriasAbierto ? "fa-chevron-up" : "fa-chevron-down"}`}
                  aria-hidden="true"
                ></i>
              </button>

              {masCategoriasAbierto && (
                <div id="categorias-extra" className={styles.listaExtra}>
                  {categoriasExtra.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => seleccionarCategoria(cat)}
                      className={`${styles.chip} ${categoria === cat ? styles.chipActivo : ""}`}
                    >
                      {cat}
                      <span className={styles.conteo}>
                        {contarCategoria(cat)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label className={styles.soloOfertas}>
          <input
            type="checkbox"
            className={styles.switchInput}
            checked={soloOfertas}
            onChange={(e) => setSoloOfertas(e.target.checked)}
          />
          <span className={styles.switchTrack} aria-hidden="true"></span>
          Solo ofertas
        </label>
      </div>

      {productosFiltrados.length === 0 ? (
        <p className={styles.sinResultados}>
          Sorry! no encontramos productos que coincidan con tu búsqueda.
        </p>
      ) : (
        <>
          <div className={styles.grid}>
            {productosVisibles.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>

          <div className={styles.pie}>
            <p className={styles.conteoTotal}>
              {productosVisibles.length} de {productosFiltrados.length}
            </p>
            {hayMasProductos && (
              <button
                className={styles.cargarMas}
                type="button"
                onClick={() =>
                  setLimiteProductos((limite) => limite + PRODUCTOS_POR_CARGA)
                }
              >
                Cargar más
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Catalogo;
