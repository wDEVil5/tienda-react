import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import TarjetaProducto from "../components/TarjetaProducto.jsx";
import { obtenerCatalogo, obtenerFacetas } from "../services/productosApi.js";
import styles from "./PaginaCatalogo.module.css";

const POR_PAGINA = 24;

// Página de listado reutilizable: sirve a categoría (/categoria/:slug), a una
// subcategoría (?sub=), a la búsqueda (/buscar?q=), a ofertas (/ofertas) y a
// todo el catálogo (/catalogo). Se remonta por ruta (key en App), así cada
// navegación arranca con estado limpio. Los filtros (marca/precio) viven en
// estado local: refiltran sin cambiar la URL ni remontar.
export default function PaginaCatalogo({ categorias = [] }) {
  const location = useLocation();
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const sub = searchParams.get("sub") ?? "";
  const nivel3 = searchParams.get("nivel3") ?? "";
  const consulta = searchParams.get("q") ?? "";

  const modo = location.pathname.startsWith("/ofertas")
    ? "ofertas"
    : location.pathname.startsWith("/buscar")
      ? "buscar"
      : location.pathname.startsWith("/catalogo")
        ? "todos"
        : "categoria";

  const [orden, setOrden] = useState("relevancia");
  const [productos, setProductos] = useState([]);
  const [meta, setMeta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(null);

  // Filtros del sidebar.
  const [facetas, setFacetas] = useState(null);
  const [marcasSel, setMarcasSel] = useState([]);
  const [precioMin, setPrecioMin] = useState(undefined);
  const [precioMax, setPrecioMax] = useState(undefined);
  const [precioMinTexto, setPrecioMinTexto] = useState("");
  const [precioMaxTexto, setPrecioMaxTexto] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const categoriaActual = categorias.find((c) => c.slug === slug) ?? null;
  const subcategorias = categoriaActual?.subcategorias ?? [];
  const subActual = subcategorias.find((s) => s.slug === sub) ?? null;
  const nivel3Actual = subActual?.subcategoriasHijas?.find((item) => item.slug === nivel3) ?? null;

  const titulo =
    modo === "ofertas"
      ? "Ofertas de la semana"
      : modo === "todos"
        ? "Todo el catálogo"
        : modo === "buscar"
          ? `Resultados para “${consulta}”`
          : nivel3Actual?.nombre ?? subActual?.nombre ?? categoriaActual?.nombre ?? "Categoría";

  // Contexto que se manda a la API según el modo (estable dentro del montaje).
  const filtros = useMemo(() => {
    if (modo === "ofertas") return { soloOfertas: true };
    if (modo === "todos") return {};
    if (modo === "buscar") return { busqueda: consulta };
    if (nivel3) return { subcategoria: sub, subcategoriaHija: nivel3 };
    if (sub) return { subcategoria: sub };
    return { categoria: slug };
  }, [modo, slug, sub, nivel3, consulta]);

  // Facetas (marcas + rango de precio) del contexto. Solo una vez por montaje.
  useEffect(() => {
    let vigente = true;
    obtenerFacetas(filtros).then((datos) => {
      if (vigente) setFacetas(datos);
    });
    return () => {
      vigente = false;
    };
  }, [filtros]);

  // Lista de productos: contexto + orden + filtros del sidebar. El spinner se
  // activa en los eventos (no en el efecto) para no caer en set-state-in-effect.
  useEffect(() => {
    let vigente = true;
    obtenerCatalogo({ ...filtros, orden, marca: marcasSel, precioMin, precioMax, page: 1, limit: POR_PAGINA })
      .then((resultado) => {
        if (!vigente) return;
        setProductos(resultado.productos);
        setMeta(resultado.meta);
        setError(null);
      })
      .catch(() => {
        if (vigente) setError("No pudimos cargar los productos. Intenta de nuevo.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [filtros, orden, marcasSel, precioMin, precioMax]);

  const hayMas = meta ? (meta.page ?? 1) < (meta.totalPages ?? 1) : false;

  function cargarMas() {
    if (!hayMas || cargandoMas) return;
    setCargandoMas(true);
    obtenerCatalogo({
      ...filtros,
      orden,
      marca: marcasSel,
      precioMin,
      precioMax,
      page: (meta.page ?? 1) + 1,
      limit: POR_PAGINA,
    })
      .then((resultado) => {
        setProductos((actuales) => [...actuales, ...resultado.productos]);
        setMeta(resultado.meta);
      })
      .catch(() => setError("No pudimos cargar más productos."))
      .finally(() => setCargandoMas(false));
  }

  function cambiarOrden(evento) {
    setCargando(true);
    setOrden(evento.target.value);
  }

  function alternarMarca(slugMarca) {
    setCargando(true);
    setMarcasSel((actuales) =>
      actuales.includes(slugMarca)
        ? actuales.filter((m) => m !== slugMarca)
        : [...actuales, slugMarca],
    );
  }

  function aplicarPrecio(evento) {
    evento.preventDefault();
    const min = precioMinTexto.trim() === "" ? undefined : Math.max(0, Number(precioMinTexto));
    const max = precioMaxTexto.trim() === "" ? undefined : Math.max(0, Number(precioMaxTexto));
    setCargando(true);
    setPrecioMin(Number.isFinite(min) ? min : undefined);
    setPrecioMax(Number.isFinite(max) ? max : undefined);
  }

  function limpiarFiltros() {
    setCargando(true);
    setMarcasSel([]);
    setPrecioMin(undefined);
    setPrecioMax(undefined);
    setPrecioMinTexto("");
    setPrecioMaxTexto("");
  }

  const hayFiltros = marcasSel.length > 0 || precioMin !== undefined || precioMax !== undefined;
  const total = meta?.total ?? productos.length;
  const marcasFaceta = facetas?.marcas ?? [];
  const mostrarSidebar = marcasFaceta.length > 0 || (facetas?.precio?.max ?? 0) > 0;

  return (
    <main className={styles.pagina}>
      <nav className={styles.miga} aria-label="Ruta">
        <Link to="/">Inicio</Link>
        {modo === "categoria" && categoriaActual && (
          <>
            <span aria-hidden="true">/</span>
            {subActual ? (
              <Link to={`/categoria/${categoriaActual.slug}`}>{categoriaActual.nombre}</Link>
            ) : (
              <span className={styles.migaActual}>{categoriaActual.nombre}</span>
            )}
          </>
        )}
        {subActual && (
          <>
            <span aria-hidden="true">/</span>
            <span className={styles.migaActual}>{subActual.nombre}</span>
          </>
        )}
        {modo !== "categoria" && (
          <>
            <span aria-hidden="true">/</span>
            <span className={styles.migaActual}>
              {modo === "ofertas" ? "Ofertas" : modo === "todos" ? "Catálogo" : "Búsqueda"}
            </span>
          </>
        )}
      </nav>

      <header className={styles.cabecera}>
        <div className={styles.tituloCaja}>
          <h1 className={styles.titulo}>{titulo}</h1>
          <span className={styles.conteo}>
            {cargando ? "…" : `${total.toLocaleString("es-CL")} ${total === 1 ? "producto" : "productos"}`}
          </span>
        </div>
        <label className={styles.orden}>
          <span>Ordenar</span>
          <select value={orden} onChange={cambiarOrden}>
            <option value="relevancia">Recomendados</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre-asc">Nombre: A - Z</option>
          </select>
        </label>
      </header>

      {modo === "categoria" && subcategorias.length > 0 && (
        <div className={styles.chips} aria-label="Subcategorías">
          <Link to={`/categoria/${slug}`} className={`${styles.chip} ${!sub ? styles.chipActivo : ""}`}>
            Todo
          </Link>
          {subcategorias.map((s) => (
            <Link
              key={s.slug ?? s.id}
              to={`/categoria/${slug}?sub=${encodeURIComponent(s.slug)}`}
              className={`${styles.chip} ${sub === s.slug ? styles.chipActivo : ""}`}
            >
              {s.nombre}
            </Link>
          ))}
        </div>
      )}

      <div className={styles.cuerpo}>
        {mostrarSidebar && (
          <>
            <button
              type="button"
              className={styles.botonFiltros}
              onClick={() => setFiltrosAbiertos((v) => !v)}
              aria-expanded={filtrosAbiertos}
            >
              Filtros{hayFiltros ? ` (${marcasSel.length + (precioMin !== undefined || precioMax !== undefined ? 1 : 0)})` : ""}
            </button>
            <aside className={`${styles.sidebar} ${filtrosAbiertos ? styles.sidebarAbierto : ""}`}>
              {hayFiltros && (
                <button type="button" className={styles.limpiar} onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}

              {marcasFaceta.length > 0 && (
                <section className={styles.grupo}>
                  <h2 className={styles.grupoTitulo}>Marcas</h2>
                  <ul className={styles.opciones}>
                    {marcasFaceta.map((m) => (
                      <li key={m.slug}>
                        <label className={styles.opcion}>
                          <input
                            type="checkbox"
                            checked={marcasSel.includes(m.slug)}
                            onChange={() => alternarMarca(m.slug)}
                          />
                          <span className={styles.opcionNombre}>{m.nombre}</span>
                          <span className={styles.opcionConteo}>({m.total})</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={styles.grupo}>
                <h2 className={styles.grupoTitulo}>Precio</h2>
                <form className={styles.precio} onSubmit={aplicarPrecio}>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="Mín"
                    value={precioMinTexto}
                    onChange={(e) => setPrecioMinTexto(e.target.value)}
                    aria-label="Precio mínimo"
                  />
                  <span aria-hidden="true">–</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="Máx"
                    value={precioMaxTexto}
                    onChange={(e) => setPrecioMaxTexto(e.target.value)}
                    aria-label="Precio máximo"
                  />
                  <button type="submit">Aplicar</button>
                </form>
              </section>
            </aside>
          </>
        )}

        <div className={styles.contenido}>
          {cargando ? (
            <p className={styles.estado} role="status">Cargando productos…</p>
          ) : error ? (
            <p className={styles.estado} role="alert">{error}</p>
          ) : productos.length === 0 ? (
            <div className={styles.vacio}>
              <p>No encontramos productos con estos filtros.</p>
              {hayFiltros ? (
                <button type="button" className={styles.volver} onClick={limpiarFiltros}>
                  Quitar filtros
                </button>
              ) : (
                <Link to="/" className={styles.volver}>Volver al inicio</Link>
              )}
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {productos.map((producto) => (
                  <TarjetaProducto key={producto.id} producto={producto} />
                ))}
              </div>
              {hayMas && (
                <div className={styles.masCaja}>
                  <button type="button" className={styles.mas} onClick={cargarMas} disabled={cargandoMas}>
                    {cargandoMas ? "Cargando…" : "Cargar más"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
