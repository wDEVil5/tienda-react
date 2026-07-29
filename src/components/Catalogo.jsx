import { useState, useEffect } from "react";
import TarjetaProducto from "./TarjetaProducto.jsx";
import styles from "../Catalogo.module.css";

const LIMITE_CATEGORIAS_VISIBLES = 6;
const LIMITE_CATEGORIAS_TABLET = 4;
const CONSULTA_TABLET = "(min-width: 768px) and (max-width: 1023px)";
// Por ahora la API entrega todos los productos. Con un backend propio, este límite
// debería enviarse a la API, por ejemplo: /productos?page=1&limit=12.
const PRODUCTOS_POR_CARGA = 10;

function Catalogo({
  productos,
  busqueda,
  onBuscar,
  categoria,
  onSeleccionarCategoria,
  soloOfertas,
  onCambiarSoloOfertas,
}) {
  // `categoria` vive en App para que también pueda cambiarse desde las
  // sugerencias del Header; este componente solo notifica la intención.
  const [esTablet, setEsTablet] = useState(
    () => typeof window !== "undefined" && window.matchMedia(CONSULTA_TABLET).matches
  );
  const [masCategoriasAbierto, setMasCategoriasAbierto] = useState(false);
  const [limiteProductos, setLimiteProductos] = useState(PRODUCTOS_POR_CARGA);
  const [orden, setOrden] = useState("relevancia"); // criterio de ordenamiento
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false); // hoja de filtros (móvil)
  // Rango de precio: null = sin límite (usa el extremo del catálogo).
  const [precioMin, setPrecioMin] = useState(null);
  const [precioMax, setPrecioMax] = useState(null);

  // Mientras la hoja de filtros está abierta (solo móvil): cerrar con Escape y
  // bloquear el scroll del fondo. Mismo patrón que el drawer del carrito.
  useEffect(() => {
    if (!filtrosAbiertos) return;
    const alPresionar = (e) => {
      if (e.key === "Escape") setFiltrosAbiertos(false);
    };
    window.addEventListener("keydown", alPresionar);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = "";
    };
  }, [filtrosAbiertos]);

  // El límite de chips cambia solo en tablet: evita que una categoría quede
  // aislada en una nueva fila y conserva el acceso a las restantes en "más".
  useEffect(() => {
    const mediaTablet = window.matchMedia(CONSULTA_TABLET);
    const actualizarTablet = (evento) => setEsTablet(evento.matches);
    mediaTablet.addEventListener("change", actualizarTablet);
    return () => mediaTablet.removeEventListener("change", actualizarTablet);
  }, []);

  // La categoría "todas" es una opción de interfaz; las demás llegan del catálogo.
  const categorias = ["todas", ...new Set(productos.map((p) => p.categoria))];
  const limiteCategorias = esTablet
    ? LIMITE_CATEGORIAS_TABLET
    : LIMITE_CATEGORIAS_VISIBLES;
  const categoriasVisibles = categorias.slice(0, limiteCategorias);
  const categoriasExtra = categorias.slice(limiteCategorias);

  // Conteo de productos por categoría (derivado) para el número de cada chip.
  const conteos = productos.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] || 0) + 1;
    return acc;
  }, {});
  const contarCategoria = (cat) =>
    cat === "todas" ? productos.length : conteos[cat] ?? 0;

  // Límites de precio del catálogo (derivados) para el slider de rango.
  const precios = productos.map((p) => p.precio);
  const precioPiso = precios.length ? Math.floor(Math.min(...precios)) : 0;
  const precioTope = precios.length ? Math.ceil(Math.max(...precios)) : 0;
  const minActual = precioMin ?? precioPiso;
  const maxActual = precioMax ?? precioTope;
  const rango = precioTope - precioPiso || 1;

  const seleccionarCategoria = (cat) => {
    onSeleccionarCategoria(cat);
    setMasCategoriasAbierto(false);
  };

  const limpiarFiltros = () => {
    onBuscar("");
    onSeleccionarCategoria("todas");
    onCambiarSoloOfertas(false);
    setPrecioMin(null);
    setPrecioMax(null);
    setMasCategoriasAbierto(false);
  };

  // Cuántos filtros están activos (para el badge del botón "Filtrar").
  const precioActivo = minActual > precioPiso || maxActual < precioTope;
  const filtrosActivos =
    (categoria !== "todas" ? 1 : 0) +
    (soloOfertas ? 1 : 0) +
    (precioActivo ? 1 : 0);

  // Cuando cambia cualquier filtro, volvemos a la primera "tanda" de productos.
  // Patrón de ajuste en render (sin useEffect), comparando con el valor anterior.
  const [filtrosPrevios, setFiltrosPrevios] = useState({
    busqueda,
    categoria,
    soloOfertas,
    minActual,
    maxActual,
  });
  if (
    filtrosPrevios.busqueda !== busqueda ||
    filtrosPrevios.categoria !== categoria ||
    filtrosPrevios.soloOfertas !== soloOfertas ||
    filtrosPrevios.minActual !== minActual ||
    filtrosPrevios.maxActual !== maxActual
  ) {
    setFiltrosPrevios({ busqueda, categoria, soloOfertas, minActual, maxActual });
    setLimiteProductos(PRODUCTOS_POR_CARGA);
  }

  const productosFiltrados = productos.filter((producto) => {
    const coincideBusqueda = producto.nombre
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoria === "todas" || producto.categoria === categoria;

    const coincideOferta = !soloOfertas || producto.precioAnterior !== null;

    const coincidePrecio =
      producto.precio >= minActual && producto.precio <= maxActual;

    return (
      coincideBusqueda && coincideCategoria && coincideOferta && coincidePrecio
    );
  });

  // Ordenamiento derivado. .sort() MUTA el array, así que copiamos primero con
  // [...] para no alterar productosFiltrados (ni, por ende, la prop productos).
  const productosOrdenados = [...productosFiltrados];
  if (orden === "precio-asc") {
    productosOrdenados.sort((a, b) => a.precio - b.precio);
  } else if (orden === "precio-desc") {
    productosOrdenados.sort((a, b) => b.precio - a.precio);
  } else if (orden === "alfabetico") {
    productosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  const productosVisibles = productosOrdenados.slice(0, limiteProductos);
  const hayMasProductos = limiteProductos < productosFiltrados.length;

  // Chips de categoría (se reutilizan en la fila de escritorio y en la hoja).
  const renderChips = (lista) =>
    lista.map((cat) => (
      <button
        key={cat}
        type="button"
        onClick={() => seleccionarCategoria(cat)}
        className={`${styles.chip} ${categoria === cat ? styles.chipActivo : ""}`}
        aria-pressed={categoria === cat}
      >
        {cat}
        <span className={styles.conteo}>{contarCategoria(cat)}</span>
      </button>
    ));

  return (
    <section id="catalogo" className={styles.catalogo}>
      <div className={styles.catalogoInner}>
        <div className={styles.encabezado}>
          <div className={styles.tituloFila}>
            <h2 className={styles.titulo}>Todo el catálogo</h2>
            <p className={styles.subtitulo}>
              <span>{productosFiltrados.length}</span>
              <span className={styles.subtituloDetalle}>
                {" "}
                productos · precios de hoy
              </span>
            </p>
          </div>

          <div className={styles.barraOrden}>
            <label htmlFor="orden" className={styles.ordenLabel}>
              Ordenar:
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

        {/* Barra superior (solo móvil): Filtrar + orden + conteo. Reemplaza la
            fila de orden del escritorio, que se oculta en móvil. */}
        <div className={styles.toolbarMovil}>
          <button
            className={styles.abrirFiltros}
            type="button"
            onClick={() => setFiltrosAbiertos(true)}
            aria-expanded={filtrosAbiertos}
            aria-controls="filtros-sheet"
          >
            Filtrar
            {filtrosActivos > 0 && (
              <span className={styles.filtrosBadge}>{filtrosActivos}</span>
            )}
          </button>

          <select
            className={styles.ordenSelect}
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            aria-label="Ordenar"
          >
            <option value="relevancia">Relevancia</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="alfabetico">Nombre: A - Z</option>
          </select>

          <span className={styles.conteoMovil}>
            {productosVisibles.length} de {productosFiltrados.length}
          </span>
        </div>

        {/* Fondo oscuro de la hoja (solo móvil). Cerrar al tocar fuera. */}
        {filtrosAbiertos && (
          <div
            className={styles.filtrosOverlay}
            onClick={() => setFiltrosAbiertos(false)}
          ></div>
        )}

        <div
          id="filtros-sheet"
          className={`${styles.controles} ${filtrosAbiertos ? styles.controlesAbierto : ""}`}
        >
          <span className={styles.sheetHandle} aria-hidden="true"></span>

          {/* Encabezado de la hoja (solo móvil). */}
          <div className={styles.sheetHeader}>
            <span className={styles.sheetTitulo}>Filtrar</span>
            <button
              className={styles.limpiar}
              type="button"
              onClick={limpiarFiltros}
            >
              Limpiar
            </button>
          </div>

          <p className={styles.grupoLabel}>Categoría</p>
          <div className={styles.chips}>
            {renderChips(categoriasVisibles)}

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
                    {renderChips(categoriasExtra)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rango de precio (slider de dos extremos). */}
          <p className={styles.grupoLabel}>Precio</p>
          <div className={styles.precioGrupo}>
            <div className={styles.precioRango}>
              <span className={styles.precioPista} aria-hidden="true"></span>
              <span
                className={styles.precioRelleno}
                style={{
                  left: `${((minActual - precioPiso) / rango) * 100}%`,
                  right: `${100 - ((maxActual - precioPiso) / rango) * 100}%`,
                }}
                aria-hidden="true"
              ></span>
              <input
                type="range"
                min={precioPiso}
                max={precioTope}
                value={minActual}
                onChange={(e) =>
                  setPrecioMin(Math.min(Number(e.target.value), maxActual))
                }
                aria-label="Precio mínimo"
              />
              <input
                type="range"
                min={precioPiso}
                max={precioTope}
                value={maxActual}
                onChange={(e) =>
                  setPrecioMax(Math.max(Number(e.target.value), minActual))
                }
                aria-label="Precio máximo"
              />
            </div>
            <div className={styles.precioValores}>
              <span>${minActual.toLocaleString("es-CL")}</span>
              <span>${maxActual.toLocaleString("es-CL")}</span>
            </div>
          </div>

          <p className={styles.grupoLabel}>Filtros</p>
          <label className={styles.soloOfertas}>
            Solo ofertas
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={soloOfertas}
              onChange={(e) => onCambiarSoloOfertas(e.target.checked)}
            />
            <span className={styles.switchTrack} aria-hidden="true"></span>
          </label>

          {/* Deshabilitados: dependen de datos que aún no existen (stock / modo
              de entrega). Se muestran para reflejar el diseño; llegan con el backend. */}
          <label className={`${styles.soloOfertas} ${styles.switchPronto}`}>
            Disponible hoy
            <input type="checkbox" className={styles.switchInput} disabled />
            <span className={styles.switchTrack} aria-hidden="true"></span>
          </label>
          <label className={`${styles.soloOfertas} ${styles.switchPronto}`}>
            Retiro en tienda
            <input type="checkbox" className={styles.switchInput} disabled />
            <span className={styles.switchTrack} aria-hidden="true"></span>
          </label>

          {/* Cierra la hoja (solo móvil). */}
          <button
            className={styles.verProductos}
            type="button"
            onClick={() => setFiltrosAbiertos(false)}
          >
            Ver {productosFiltrados.length} productos
          </button>
        </div>

        {/* El header puede quedar fuera de vista al navegar al catálogo. Este
            chip compacto conserva una salida visible para quitar la búsqueda. */}
        {busqueda.trim() && (
          <div className={styles.busquedaActiva}>
            <span>“{busqueda}”</span>
            <button
              type="button"
              onClick={() => onBuscar("")}
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        )}

        {productosFiltrados.length === 0 ? (
          <p className={styles.sinResultados} role="status">
            No encontramos productos que coincidan con tu búsqueda.
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
      </div>
    </section>
  );
}

export default Catalogo;
