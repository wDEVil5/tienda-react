import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import TarjetaProducto from "../components/TarjetaProducto.jsx";
import { obtenerCatalogo, obtenerFacetas } from "../services/productosApi.js";
import styles from "./PaginaCatalogo.module.css";

const POR_PAGINA = 24;

function leerAtributosUrl(valor) {
  if (!valor) return [];
  return valor.split(",").flatMap((item) => {
    const [atributo, opcion] = item.split(":");
    return atributo && opcion ? [{ atributo, opcion }] : [];
  });
}

// Página de listado reutilizable: sirve a categoría (/categoria/:slug), a una
// subcategoría (?sub=), a la búsqueda (/buscar?q=), a ofertas (/ofertas) y a
// todo el catálogo (/catalogo). Se remonta por ruta (key en App), así cada
// navegación arranca con estado limpio. Los atributos se reflejan en URL para
// compartir el resultado; marca y precio siguen siendo filtros locales.
export default function PaginaCatalogo({ categorias = [] }) {
  const location = useLocation();
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
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
  // Inicializa desde ?marca= (deep-link, p. ej. clic en la marca de una ficha).
  // Luego el filtro sigue siendo local, como el resto del sidebar.
  const [marcasSel, setMarcasSel] = useState(() => {
    const marcaUrl = searchParams.get("marca");
    return marcaUrl ? marcaUrl.split(",").filter(Boolean) : [];
  });
  const [atributosSel, setAtributosSel] = useState(() => leerAtributosUrl(searchParams.get("atributos")));
  const [precioMin, setPrecioMin] = useState(undefined);
  const [precioMax, setPrecioMax] = useState(undefined);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [marcaBusqueda, setMarcaBusqueda] = useState("");
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({ marcas: true, precio: true, atributos: true });
  const [soloOfertasSeleccionado, setSoloOfertasSeleccionado] = useState(false);
  const [soloDisponiblesSeleccionado, setSoloDisponiblesSeleccionado] = useState(false);
  // Valor visual del rango de precio mientras se arrastra ({ min, max } | null).
  // Solo alimenta la posición del thumb; el filtro real se aplica al soltar, para
  // no lanzar una consulta por cada paso del arrastre.
  const [precioBorrador, setPrecioBorrador] = useState(null);

  const categoriaActual = categorias.find((c) => c.slug === slug) ?? null;
  const subcategorias = categoriaActual?.subcategorias ?? [];
  const subActual = subcategorias.find((s) => s.slug === sub) ?? null;
  const nivel3Actual = subActual?.subcategoriasHijas?.find((item) => item.slug === nivel3) ?? null;
  // Las píldoras son contextuales (como Jumbo): dentro de una subcategoría con
  // tercer nivel mostramos sus hijas; en el nivel de categoría, las subcategorías.
  const hijasDeSub = subActual?.subcategoriasHijas ?? [];

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
    const conOfertas = modo === "ofertas" || soloOfertasSeleccionado ? { soloOfertas: true } : {};
    const conDisponibles = soloDisponiblesSeleccionado ? { soloDisponibles: true } : {};
    if (modo === "ofertas") return { ...conOfertas, ...conDisponibles };
    if (modo === "todos") return { ...conOfertas, ...conDisponibles };
    if (modo === "buscar") return { busqueda: consulta, ...conOfertas, ...conDisponibles };
    if (nivel3) return { subcategoria: sub, subcategoriaHija: nivel3, ...conOfertas, ...conDisponibles };
    if (sub) return { subcategoria: sub, ...conOfertas, ...conDisponibles };
    return { categoria: slug, ...conOfertas, ...conDisponibles };
  }, [modo, slug, sub, nivel3, consulta, soloOfertasSeleccionado, soloDisponiblesSeleccionado]);

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
    obtenerCatalogo({ ...filtros, orden, marca: marcasSel, atributos: atributosSel, precioMin, precioMax, page: 1, limit: POR_PAGINA })
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
  }, [filtros, orden, marcasSel, atributosSel, precioMin, precioMax]);

  const hayMas = meta ? (meta.page ?? 1) < (meta.totalPages ?? 1) : false;

  function cargarMas() {
    if (!hayMas || cargandoMas) return;
    setCargandoMas(true);
    obtenerCatalogo({
      ...filtros,
      orden,
      marca: marcasSel,
      atributos: atributosSel,
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

  function alternarAtributo(atributo, opcion) {
    const yaSeleccionado = atributosSel.some((item) => item.atributo === atributo && item.opcion === opcion);
    const siguientes = yaSeleccionado
      ? atributosSel.filter((item) => item.atributo !== atributo)
      : [...atributosSel.filter((item) => item.atributo !== atributo), { atributo, opcion }];
    const parametros = new URLSearchParams(searchParams);
    if (siguientes.length) {
      parametros.set("atributos", siguientes.map((item) => `${item.atributo}:${item.opcion}`).join(","));
    } else {
      parametros.delete("atributos");
    }
    setCargando(true);
    setAtributosSel(siguientes);
    setSearchParams(parametros, { replace: true });
  }

  const rangoPrecioMinimo = Number(facetas?.precio?.min ?? 0);
  const rangoPrecioMaximo = Math.max(rangoPrecioMinimo + 1, Number(facetas?.precio?.max ?? rangoPrecioMinimo + 1));
  const precioRangoMinimo = precioBorrador?.min ?? precioMin ?? rangoPrecioMinimo;
  const precioRangoMaximo = precioBorrador?.max ?? precioMax ?? rangoPrecioMaximo;

  // Durante el arrastre solo movemos el thumb (sin consultar la API).
  function arrastrarPrecio(limite, valor) {
    const siguienteValor = Number(valor);
    setPrecioBorrador({
      min: limite === "min" ? Math.min(siguienteValor, precioRangoMaximo) : precioRangoMinimo,
      max: limite === "max" ? Math.max(siguienteValor, precioRangoMinimo) : precioRangoMaximo,
    });
  }

  // Al soltar (o soltar la tecla) recién aplicamos el filtro y lanzamos la consulta.
  function confirmarPrecio() {
    if (!precioBorrador) return;
    setCargando(true);
    setPrecioMin(precioBorrador.min <= rangoPrecioMinimo ? undefined : precioBorrador.min);
    setPrecioMax(precioBorrador.max >= rangoPrecioMaximo ? undefined : precioBorrador.max);
    setPrecioBorrador(null);
  }

  function limpiarFiltros() {
    setCargando(true);
    setMarcasSel([]);
    setAtributosSel([]);
    setPrecioMin(undefined);
    setPrecioMax(undefined);
    setPrecioBorrador(null);
    setSoloOfertasSeleccionado(false);
    setSoloDisponiblesSeleccionado(false);
    const parametros = new URLSearchParams(searchParams);
    parametros.delete("atributos");
    setSearchParams(parametros, { replace: true });
  }

  const hayFiltros = marcasSel.length > 0 || atributosSel.length > 0 || precioMin !== undefined || precioMax !== undefined || soloOfertasSeleccionado || soloDisponiblesSeleccionado;
  const cantidadFiltros = marcasSel.length + atributosSel.length + (precioMin !== undefined || precioMax !== undefined ? 1 : 0) + (soloOfertasSeleccionado ? 1 : 0) + (soloDisponiblesSeleccionado ? 1 : 0);
  const total = meta?.total ?? productos.length;
  const marcasFaceta = facetas?.marcas ?? [];
  const atributosFaceta = facetas?.atributos ?? [];
  const marcasVisibles = marcasFaceta.filter((marca) =>
    marca.nombre.toLocaleLowerCase("es").includes(marcaBusqueda.trim().toLocaleLowerCase("es")),
  );
  const mostrarSidebar = marcasFaceta.length > 0 || atributosFaceta.length > 0 || (facetas?.precio?.max ?? 0) > 0;
  const enlaceVolver = nivel3
    ? `/categoria/${slug}?sub=${encodeURIComponent(sub)}`
    : sub
      ? `/categoria/${slug}`
      : "/";

  function alternarSeccion(nombre) {
    setSeccionesAbiertas((actual) => ({ ...actual, [nombre]: !actual[nombre] }));
  }

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
            {nivel3Actual ? (
              <Link to={`/categoria/${categoriaActual.slug}?sub=${encodeURIComponent(subActual.slug)}`}>{subActual.nombre}</Link>
            ) : (
              <span className={styles.migaActual}>{subActual.nombre}</span>
            )}
          </>
        )}
        {nivel3Actual && (
          <>
            <span aria-hidden="true">/</span>
            <span className={styles.migaActual}>{nivel3Actual.nombre}</span>
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

      <div className={styles.cuerpo}>
        {mostrarSidebar && (
          <>
            <button
              type="button"
              className={styles.botonFiltros}
              onClick={() => setFiltrosAbiertos((v) => !v)}
              aria-expanded={filtrosAbiertos}
            >
              Filtros{hayFiltros ? ` (${cantidadFiltros})` : ""}
            </button>
            <aside className={`${styles.sidebar} ${filtrosAbiertos ? styles.sidebarAbierto : ""}`}>
              {modo === "categoria" && (
                <Link className={styles.volverSidebar} to={enlaceVolver}>
                  <span className={styles.volverFlecha} aria-hidden="true">←</span>
                  <span className={styles.volverTexto}>Volver</span>
                </Link>
              )}
              {hayFiltros && (
                <button type="button" className={styles.limpiar} onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}

              {modo !== "ofertas" && (
                <label className={styles.ofertasFiltro}>
                  <span>Solo ofertas</span>
                  <input type="checkbox" checked={soloOfertasSeleccionado} onChange={(e) => { setCargando(true); setSoloOfertasSeleccionado(e.target.checked); }} />
                </label>
              )}
              <label className={styles.ofertasFiltro}>
                <span>Disponible hoy</span>
                <input type="checkbox" checked={soloDisponiblesSeleccionado} onChange={(e) => { setCargando(true); setSoloDisponiblesSeleccionado(e.target.checked); }} />
              </label>

              {marcasFaceta.length > 0 && (
                <section className={styles.grupo}>
                  <button type="button" className={styles.grupoTitulo} onClick={() => alternarSeccion("marcas")} aria-expanded={seccionesAbiertas.marcas}>
                    <span>Marcas</span><span aria-hidden="true">{seccionesAbiertas.marcas ? "−" : "+"}</span>
                  </button>
                  {seccionesAbiertas.marcas && <>
                    {marcasFaceta.length > 6 && (
                      <input className={styles.buscarMarca} value={marcaBusqueda} onChange={(e) => setMarcaBusqueda(e.target.value)} placeholder="Buscar marca" aria-label="Buscar marca" />
                    )}
                    <ul className={styles.opciones}>
                    {marcasVisibles.map((m) => (
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
                  </>}
                </section>
              )}

              {atributosFaceta.length > 0 && (
                <section className={styles.grupo}>
                  <button type="button" className={styles.grupoTitulo} onClick={() => alternarSeccion("atributos")} aria-expanded={seccionesAbiertas.atributos}>
                    <span>Características</span><span aria-hidden="true">{seccionesAbiertas.atributos ? "−" : "+"}</span>
                  </button>
                  {seccionesAbiertas.atributos && atributosFaceta.map((atributo) => (
                    <div className={styles.atributoFaceta} key={atributo.slug}>
                      <p>{atributo.nombre}</p>
                      <ul className={styles.opciones}>
                        {atributo.opciones.map((opcion) => (
                          <li key={opcion.slug}>
                            <label className={styles.opcion}>
                              <input
                                type="checkbox"
                                name={`atributo-${atributo.slug}`}
                                checked={atributosSel.some((item) => item.atributo === atributo.slug && item.opcion === opcion.slug)}
                                onChange={() => alternarAtributo(atributo.slug, opcion.slug)}
                              />
                              <span className={styles.opcionNombre}>{opcion.nombre}</span>
                              <span className={styles.opcionConteo}>({opcion.total})</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              <section className={styles.grupo}>
                <button type="button" className={styles.grupoTitulo} onClick={() => alternarSeccion("precio")} aria-expanded={seccionesAbiertas.precio}>
                  <span>Precio</span><span aria-hidden="true">{seccionesAbiertas.precio ? "−" : "+"}</span>
                </button>
                {seccionesAbiertas.precio && (
                  <div className={styles.precio}>
                    <div className={styles.precioValores} aria-live="polite">
                      <span>${precioRangoMinimo.toLocaleString("es-CL")}</span>
                      <span>${precioRangoMaximo.toLocaleString("es-CL")}</span>
                    </div>
                    <div
                      className={styles.precioRango}
                      style={{
                        "--rango-inicio": `${((precioRangoMinimo - rangoPrecioMinimo) / (rangoPrecioMaximo - rangoPrecioMinimo)) * 100}%`,
                        "--rango-fin": `${((precioRangoMaximo - rangoPrecioMinimo) / (rangoPrecioMaximo - rangoPrecioMinimo)) * 100}%`,
                      }}
                    >
                      <input
                        className={styles.rangoMinimo}
                        type="range"
                        min={rangoPrecioMinimo}
                        max={rangoPrecioMaximo}
                        value={precioRangoMinimo}
                        onChange={(e) => arrastrarPrecio("min", e.target.value)}
                        onPointerUp={confirmarPrecio}
                        onKeyUp={confirmarPrecio}
                        onBlur={confirmarPrecio}
                        aria-label="Precio mínimo"
                      />
                      <input
                        className={styles.rangoMaximo}
                        type="range"
                        min={rangoPrecioMinimo}
                        max={rangoPrecioMaximo}
                        value={precioRangoMaximo}
                        onChange={(e) => arrastrarPrecio("max", e.target.value)}
                        onPointerUp={confirmarPrecio}
                        onKeyUp={confirmarPrecio}
                        onBlur={confirmarPrecio}
                        aria-label="Precio máximo"
                      />
                    </div>
                  </div>
                )}
              </section>
            </aside>
          </>
        )}

        <div className={styles.contenido}>
          {modo === "categoria" && sub && hijasDeSub.length > 0 ? (
            <div className={styles.chips} aria-label={`Tipos de ${subActual.nombre}`}>
              <Link
                to={`/categoria/${slug}?sub=${encodeURIComponent(sub)}`}
                className={`${styles.chip} ${!nivel3 ? styles.chipActivo : ""}`}
              >
                Todo
              </Link>
              {hijasDeSub.map((hija) => (
                <Link
                  key={hija.slug ?? hija.id}
                  to={`/categoria/${slug}?sub=${encodeURIComponent(sub)}&nivel3=${encodeURIComponent(hija.slug)}`}
                  className={`${styles.chip} ${nivel3 === hija.slug ? styles.chipActivo : ""}`}
                >
                  {hija.nombre}
                </Link>
              ))}
            </div>
          ) : modo === "categoria" && subcategorias.length > 0 ? (
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
          ) : null}
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
