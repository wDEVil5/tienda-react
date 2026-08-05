import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  archivarProductoAdmin,
  eliminarProductoAdmin,
  ErrorAdminApi,
  listarProductosAdmin,
  obtenerSesionAdmin,
  restaurarProductoAdmin,
} from "../services/adminApi.js";
import styles from "./AdminProductos.module.css";

const LIMITE = 20;
const FILTROS = [
  { valor: "", etiqueta: "Todos" },
  { valor: "PUBLICADO", etiqueta: "Publicados" },
  { valor: "BORRADOR", etiqueta: "Borradores" },
  { valor: "ARCHIVADO", etiqueta: "Archivados" },
];
const MONEDA_CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function textoEstado(estado, stock) {
  if (stock === 0 && estado === "PUBLICADO") return "Sin stock";
  return {
    PUBLICADO: "Publicado",
    BORRADOR: "Borrador",
    ARCHIVADO: "Archivado",
  }[estado] ?? estado;
}

function claseEstado(estado, stock) {
  if (stock === 0 && estado === "PUBLICADO") return styles.estadoSinStock;
  if (estado === "PUBLICADO") return styles.estadoPublicado;
  return styles.estadoNeutro;
}

function paginasVisibles(actual, total) {
  if (total <= 5) return Array.from({ length: total }, (_, indice) => indice + 1);
  const paginas = new Set([1, total, actual - 1, actual, actual + 1]);
  return [...paginas].filter((pagina) => pagina > 0 && pagina <= total).sort((a, b) => a - b);
}

function FilasCargando() {
  return Array.from({ length: 7 }, (_, indice) => (
    <tr className={styles.filaCargando} key={indice}>
      <td><span className={styles.skeletonImagen}></span></td>
      <td><span className={styles.skeletonTexto}></span></td>
      <td><span className={styles.skeletonTextoCorto}></span></td>
      <td><span className={styles.skeletonTextoCorto}></span></td>
      <td><span className={styles.skeletonTextoCorto}></span></td>
      <td><span className={styles.skeletonBadge}></span></td>
      <td></td>
    </tr>
  ));
}

export default function AdminProductos() {
  const navegar = useNavigate();
  const [usuario, setUsuario] = useState(undefined);
  const [productos, setProductos] = useState([]);
  const [meta, setMeta] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaApi, setBusquedaApi] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intento, setIntento] = useState(0);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [accionId, setAccionId] = useState(null); // archivar/restaurar en curso
  const [confirmarId, setConfirmarId] = useState(null); // fila mostrando "¿eliminar?"
  const [eliminandoId, setEliminandoId] = useState(null);
  const [mensajeAccion, setMensajeAccion] = useState(null); // { id, texto }

  useEffect(() => {
    let vigente = true;
    obtenerSesionAdmin()
      .then((sesion) => {
        if (vigente) {
          setErrorAcceso(null);
          setUsuario(sesion);
        }
      })
      .catch((errorSesion) => {
        if (vigente) {
          setErrorAcceso(
            errorSesion instanceof ErrorAdminApi
              ? errorSesion.message
              : "No pudimos comprobar el acceso al panel.",
          );
          setUsuario(null);
        }
      });
    return () => { vigente = false; };
  }, [intentoAcceso]);

  useEffect(() => {
    const termino = busqueda.trim();
    if (termino === busquedaApi) return undefined;

    const espera = window.setTimeout(() => {
      setCargando(true);
      setError(null);
      setPagina(1);
      setBusquedaApi(termino);
    }, 250);
    return () => window.clearTimeout(espera);
  }, [busqueda, busquedaApi]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;

    listarProductosAdmin({
      page: pagina,
      limit: LIMITE,
      busqueda: busquedaApi,
      estado: estado || undefined,
    })
      .then((resultado) => {
        if (!vigente) return;
        setProductos(Array.isArray(resultado.data) ? resultado.data : []);
        setMeta(resultado.meta);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setError(errorRespuesta.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => { vigente = false; };
  }, [usuario, pagina, estado, busquedaApi, intento]);

  if (usuario === undefined) {
    return (
      <main className={styles.accesoPantalla}>
        <p className={styles.comprobando} role="status">Comprobando acceso al panel…</p>
      </main>
    );
  }

  if (!usuario) {
    if (errorAcceso) {
      return (
        <main className={styles.accesoPantalla}>
          <section className={styles.accesoCaja} role="alert">
            <div className={styles.accesoMarca}>Sumarket<em>Admin</em></div>
            <div className={styles.accesoContenido}>
              <h1>No pudimos conectar</h1>
              <p>{errorAcceso}</p>
              <button
                className={styles.botonReintentar}
                type="button"
                onClick={() => {
                  setUsuario(undefined);
                  setErrorAcceso(null);
                  setIntentoAcceso((valor) => valor + 1);
                }}
              >
                Reintentar
              </button>
            </div>
          </section>
        </main>
      );
    }

    // El acceso del personal vive en su propia ruta; allí se inicia sesión.
    return <Navigate to="/admin/acceso" replace />;
  }

  const totalPaginas = meta?.totalPages ?? 1;
  const paginas = paginasVisibles(pagina, totalPaginas);
  const irAPagina = (siguientePagina) => {
    setCargando(true);
    setError(null);
    setPagina(siguientePagina);
  };

  // Acciones de fila. Un cambio afecta al listado (y a los conteos), así que
  // refrescamos con un refetch (bump de `intento`). Los errores se muestran
  // acotados a la fila (p. ej. "tiene pedidos, archívalo").
  async function archivar(producto) {
    setAccionId(producto.id);
    setMensajeAccion(null);
    try {
      await archivarProductoAdmin(producto.id);
      setIntento((valor) => valor + 1);
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setMensajeAccion({
        id: producto.id,
        texto: errorRespuesta instanceof ErrorAdminApi ? errorRespuesta.message : "No pudimos archivar el producto.",
      });
    } finally {
      setAccionId(null);
    }
  }

  async function restaurar(producto) {
    setAccionId(producto.id);
    setMensajeAccion(null);
    try {
      await restaurarProductoAdmin(producto.id);
      setIntento((valor) => valor + 1);
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setMensajeAccion({
        id: producto.id,
        texto: errorRespuesta instanceof ErrorAdminApi ? errorRespuesta.message : "No pudimos restaurar el producto.",
      });
    } finally {
      setAccionId(null);
    }
  }

  async function eliminar(producto) {
    setEliminandoId(producto.id);
    setMensajeAccion(null);
    try {
      await eliminarProductoAdmin(producto.id);
      setConfirmarId(null);
      setIntento((valor) => valor + 1);
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setConfirmarId(null);
      setMensajeAccion({
        id: producto.id,
        texto: errorRespuesta instanceof ErrorAdminApi ? errorRespuesta.message : "No pudimos eliminar el producto.",
      });
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <main className={styles.fondoAdmin}>
      <AdminShell usuario={usuario}>
        <header className={styles.cabecera}>
          <h1>Productos</h1>
          <div className={styles.accionesCabecera}>
            <label className={styles.buscar}>
              <span className={styles.srOnly}>Buscar producto por nombre o SKU</span>
              <input
                type="search"
                placeholder="Buscar producto"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </label>
            <button
              className={styles.nuevo}
              type="button"
              onClick={() => navegar("/admin/productos/nuevo")}
            >
              + Nuevo
            </button>
          </div>
        </header>

        <div className={styles.cuerpo}>
          <div className={styles.filtros} aria-label="Filtrar productos por estado">
            {FILTROS.map((filtro) => (
              <button
                key={filtro.valor || "todos"}
                className={estado === filtro.valor ? styles.filtroActivo : styles.filtro}
                type="button"
                aria-pressed={estado === filtro.valor}
                onClick={() => {
                  setCargando(true);
                  setError(null);
                  setEstado(filtro.valor);
                  setPagina(1);
                }}
              >
                {filtro.etiqueta}
                {estado === filtro.valor && meta ? ` ${meta.total}` : ""}
              </button>
            ))}
          </div>

          <div className={styles.tablaMarco}>
            <table className={styles.tabla}>
              <caption className={styles.srOnly}>Productos del catálogo administrativo</caption>
              <thead>
                <tr>
                  <th aria-label="Imagen"></th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <FilasCargando />
                ) : error ? (
                  <tr><td colSpan="7">
                    <div className={styles.estadoTabla} role="alert">
                      <strong>No pudimos cargar los productos</strong>
                      <span>{error}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCargando(true);
                          setError(null);
                          setIntento((valor) => valor + 1);
                        }}
                      >
                        Reintentar
                      </button>
                    </div>
                  </td></tr>
                ) : productos.length === 0 ? (
                  <tr><td colSpan="7">
                    <div className={styles.estadoTabla}>
                      <strong>No hay productos para mostrar</strong>
                      <span>Prueba con otra búsqueda o cambia el filtro de estado.</span>
                    </div>
                  </td></tr>
                ) : productos.map((producto) => (
                  <tr key={producto.id}>
                    <td>
                      {producto.imagen?.url ? (
                        <img
                          className={styles.miniatura}
                          src={producto.imagen.url}
                          alt={producto.imagen.alt || `Vista de ${producto.nombre}`}
                        />
                      ) : <span className={styles.miniaturaVacia} aria-hidden="true"></span>}
                    </td>
                    <td>
                      <span className={styles.nombreProducto} title={producto.nombre}>
                        {producto.nombre}
                      </span>
                      <span className={styles.sku}>SKU {producto.sku}</span>
                    </td>
                    <td title={producto.categoria?.nombre}>{producto.categoria?.nombre ?? "—"}</td>
                    <td>{MONEDA_CLP.format(producto.precio)}</td>
                    <td className={producto.stock <= 2 ? styles.stockCritico : undefined}>
                      {producto.stock ?? "—"}
                    </td>
                    <td>
                      <span className={claseEstado(producto.estado, producto.stock)}>
                        {textoEstado(producto.estado, producto.stock)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.acciones}>
                        <button
                          className={styles.editar}
                          type="button"
                          onClick={() => navegar(`/admin/productos/${producto.id}/editar`)}
                        >
                          Editar
                        </button>

                        {producto.estado === "ARCHIVADO" ? (
                          confirmarId === producto.id ? (
                            <>
                              <span className={styles.confirmarTexto}>¿Eliminar?</span>
                              <button
                                className={styles.botonPeligroSolido}
                                type="button"
                                disabled={eliminandoId === producto.id}
                                onClick={() => eliminar(producto)}
                              >
                                {eliminandoId === producto.id ? "…" : "Sí, eliminar"}
                              </button>
                              <button
                                className={styles.botonSutil}
                                type="button"
                                onClick={() => setConfirmarId(null)}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className={styles.botonSutil}
                                type="button"
                                disabled={accionId === producto.id}
                                onClick={() => restaurar(producto)}
                              >
                                {accionId === producto.id ? "…" : "Restaurar"}
                              </button>
                              <button
                                className={styles.botonPeligro}
                                type="button"
                                onClick={() => {
                                  setMensajeAccion(null);
                                  setConfirmarId(producto.id);
                                }}
                              >
                                Eliminar
                              </button>
                            </>
                          )
                        ) : (
                          <button
                            className={styles.botonSutil}
                            type="button"
                            disabled={accionId === producto.id}
                            onClick={() => archivar(producto)}
                          >
                            {accionId === producto.id ? "…" : "Archivar"}
                          </button>
                        )}
                      </div>
                      {mensajeAccion?.id === producto.id && (
                        <p className={styles.mensajeFila} role="alert">
                          {mensajeAccion.texto}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!cargando && !error && productos.length > 0 && (
            <footer className={styles.pieTabla}>
              <span>
                Mostrando {productos.length} de {meta?.total ?? productos.length}
              </span>
              {totalPaginas > 1 && (
                <nav className={styles.paginacion} aria-label="Paginación de productos">
                  <button
                    type="button"
                    onClick={() => irAPagina(pagina - 1)}
                    disabled={pagina === 1}
                    aria-label="Página anterior"
                  >
                    ‹
                  </button>
                  {paginas.map((numero, indice) => {
                    const anterior = paginas[indice - 1];
                    return (
                      <span className={styles.grupoPagina} key={numero}>
                        {anterior && numero - anterior > 1 && <span aria-hidden="true">…</span>}
                        <button
                          type="button"
                          className={numero === pagina ? styles.paginaActiva : undefined}
                          aria-current={numero === pagina ? "page" : undefined}
                          onClick={() => irAPagina(numero)}
                        >
                          {numero}
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => irAPagina(pagina + 1)}
                    disabled={pagina === totalPaginas}
                    aria-label="Página siguiente"
                  >
                    ›
                  </button>
                </nav>
              )}
            </footer>
          )}
        </div>
      </AdminShell>
    </main>
  );
}
