import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import TarjetaProducto from "../components/TarjetaProducto.jsx";
import { obtenerCatalogo } from "../services/productosApi.js";
import styles from "./PaginaCatalogo.module.css";

const POR_PAGINA = 24;

// Página de listado reutilizable: sirve a categoría (/categoria/:slug), a una
// subcategoría (?sub=), a la búsqueda (/buscar?q=), a ofertas (/ofertas) y a
// todo el catálogo (/catalogo). Se remonta por ruta (key en App), así cada
// navegación arranca con estado limpio.
export default function PaginaCatalogo({ categorias = [] }) {
  const location = useLocation();
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const sub = searchParams.get("sub") ?? "";
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

  const categoriaActual = categorias.find((c) => c.slug === slug) ?? null;
  const subcategorias = categoriaActual?.subcategorias ?? [];
  const subActual = subcategorias.find((s) => s.slug === sub) ?? null;

  const titulo =
    modo === "ofertas"
      ? "Ofertas de la semana"
      : modo === "todos"
        ? "Todo el catálogo"
        : modo === "buscar"
          ? `Resultados para “${consulta}”`
          : subActual?.nombre ?? categoriaActual?.nombre ?? "Categoría";

  // Filtros que se mandan a la API según el modo. Memorizado con los valores de
  // la URL: estable dentro del montaje (la página se remonta al navegar).
  const filtros = useMemo(() => {
    if (modo === "ofertas") return { soloOfertas: true };
    if (modo === "todos") return {};
    if (modo === "buscar") return { busqueda: consulta };
    if (sub) return { subcategoria: sub };
    return { categoria: slug };
  }, [modo, slug, sub, consulta]);

  useEffect(() => {
    let vigente = true;
    obtenerCatalogo({ ...filtros, orden, page: 1, limit: POR_PAGINA })
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
  }, [filtros, orden]);

  const hayMas = meta ? (meta.page ?? 1) < (meta.totalPages ?? 1) : false;

  function cargarMas() {
    if (!hayMas || cargandoMas) return;
    setCargandoMas(true);
    obtenerCatalogo({ ...filtros, orden, page: (meta.page ?? 1) + 1, limit: POR_PAGINA })
      .then((resultado) => {
        setProductos((actuales) => [...actuales, ...resultado.productos]);
        setMeta(resultado.meta);
      })
      .catch(() => setError("No pudimos cargar más productos."))
      .finally(() => setCargandoMas(false));
  }

  // Cambiar el orden refetchea desde la página 1; el spinner se activa aquí
  // (evento), no en el efecto.
  function cambiarOrden(evento) {
    setCargando(true);
    setOrden(evento.target.value);
  }

  const total = meta?.total ?? productos.length;

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
          <Link
            to={`/categoria/${slug}`}
            className={`${styles.chip} ${!sub ? styles.chipActivo : ""}`}
          >
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

      {cargando ? (
        <p className={styles.estado} role="status">Cargando productos…</p>
      ) : error ? (
        <p className={styles.estado} role="alert">{error}</p>
      ) : productos.length === 0 ? (
        <div className={styles.vacio}>
          <p>No encontramos productos aquí.</p>
          <Link to="/" className={styles.volver}>Volver al inicio</Link>
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
    </main>
  );
}
