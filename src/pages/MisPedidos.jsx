import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ImagenProducto from "../components/ImagenProducto.jsx";
import { listarPedidosCuenta } from "../services/cuentaApi.js";
import styles from "./MisPedidos.module.css";

const ESTADOS_EN_CURSO = new Set([
  "PENDIENTE",
  "PREPARANDO",
  "LISTO_PARA_RETIRO",
  "ENVIADO",
]);

const etiquetasEstado = {
  PENDIENTE: "Pendiente",
  PREPARANDO: "En preparación",
  LISTO_PARA_RETIRO: "Listo para retiro",
  ENVIADO: "Enviada",
  ENTREGADO: "Entregada",
  CANCELADO: "Cancelada",
};

function formatearCLP(monto) {
  return `\u0024${Number(monto ?? 0).toLocaleString("es-CL")}`;
}

function formatearFecha(fecha) {
  const fechaPedido = new Date(fecha);
  if (Number.isNaN(fechaPedido.valueOf())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(fechaPedido)
    .replace(".", "");
}

function textoCantidad(cantidad, singular, plural) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

function descripcionPedido(pedido) {
  if (pedido.estado === "CANCELADO") return "Pedido cancelado";
  if (pedido.modalidad === "RETIRO") return "Retiro en tienda";
  return pedido.comuna ? `Despacho a ${pedido.comuna}` : "Despacho a domicilio";
}

// Listado paginado de la cuenta. Las miniaturas llegan dentro del resumen de
// pedido para no disparar una consulta adicional por cada fila mostrada.
function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");

  const cargarPedidosAnteriores = async () => {
    if (!meta || cargandoMas) return;

    setCargandoMas(true);
    try {
      const respuesta = await listarPedidosCuenta({ page: meta.page + 1, limit: 10 });
      setPedidos((actuales) => [...actuales, ...(respuesta.data ?? [])]);
      setMeta(respuesta.meta ?? null);
    } catch (errorSolicitud) {
      setError(errorSolicitud.message || "No pudimos cargar tus pedidos.");
    } finally {
      setCargandoMas(false);
    }
  };

  useEffect(() => {
    let vigente = true;

    listarPedidosCuenta({ page: 1, limit: 10 })
      .then((respuesta) => {
        if (!vigente) return;
        setPedidos(respuesta.data ?? []);
        setMeta(respuesta.meta ?? null);
      })
      .catch((errorSolicitud) => {
        if (vigente) setError(errorSolicitud.message || "No pudimos cargar tus pedidos.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const pedidosFiltrados = useMemo(() => {
    if (filtro === "en-curso") {
      return pedidos.filter((pedido) => ESTADOS_EN_CURSO.has(pedido.estado));
    }
    if (filtro === "entregados") {
      return pedidos.filter((pedido) => pedido.estado === "ENTREGADO");
    }
    return pedidos;
  }, [filtro, pedidos]);

  const puedeCargarMas = meta && meta.page < meta.totalPages;

  return (
    <section className={styles.pantalla} aria-labelledby="titulo-pedidos">
      <header className={styles.cabecera}>
        <Link to="/" className={styles.logo}>
          Sumarket<em>Express</em>
        </Link>
      </header>

      <div className={styles.cuerpo}>
        <aside className={styles.navegacion} aria-label="Secciones de mi cuenta">
          <Link to="/mi-cuenta">Resumen</Link>
          <span className={styles.navActiva} aria-current="page">Mis pedidos</span>
          <Link to="/mi-cuenta#direcciones">Direcciones</Link>
          <Link to="/mi-cuenta/datos">Datos y seguridad</Link>
        </aside>

        <div className={styles.contenidoPedidos}>
          <div className={styles.encabezadoPagina}>
            <h1 id="titulo-pedidos">Mis pedidos</h1>
            <div className={styles.filtros} aria-label="Filtrar pedidos">
              <button type="button" className={filtro === "todos" ? styles.filtroActivo : ""} onClick={() => setFiltro("todos")}>Todos</button>
              <button type="button" className={filtro === "en-curso" ? styles.filtroActivo : ""} onClick={() => setFiltro("en-curso")}>En curso</button>
              <button type="button" className={filtro === "entregados" ? styles.filtroActivo : ""} onClick={() => setFiltro("entregados")}>Entregados</button>
            </div>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          {cargando ? (
            <p className={styles.estado}>Cargando tus pedidos…</p>
          ) : pedidosFiltrados.length === 0 ? (
            <div className={styles.vacio}>
              <h2>No hay pedidos en esta vista</h2>
              <p>Cuando realices una compra, aparecerá aquí con su estado.</p>
              <Link to="/#catalogo">Ver catálogo</Link>
            </div>
          ) : (
            <div className={styles.lista}>
              {pedidosFiltrados.map((pedido) => (
                <article key={pedido.id} className={styles.pedido}>
                  {pedido.previsualizaciones?.length > 0 && (
                    <div className={styles.previsualizaciones} aria-label="Productos del pedido">
                      {pedido.previsualizaciones.map((imagen, indice) => (
                        <span className={styles.miniatura} key={`${pedido.id}-${imagen.url}-${indice}`}>
                          <ImagenProducto src={imagen.url} alt={imagen.textoAlternativo || "Producto del pedido"} className={styles.imagenMiniatura} />
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.infoPedido}>
                    <p className={styles.identificador}>#SE-{pedido.numero} <span aria-hidden="true">·</span> {formatearFecha(pedido.createdAt)}</p>
                    <p className={styles.descripcion}>
                      {textoCantidad(pedido.cantidadProductos, "producto", "productos")}, {textoCantidad(pedido.cantidadUnidades, "unidad", "unidades")} <span aria-hidden="true">·</span> {descripcionPedido(pedido)}
                    </p>
                  </div>
                  <span className={`${styles.estadoPedido} ${styles[`estado${pedido.estado}`] || ""}`}>{etiquetasEstado[pedido.estado] ?? pedido.estado}</span>
                  <strong className={styles.total}>{formatearCLP(pedido.total)}</strong>
                  <Link className={styles.ver} to={`/mi-cuenta/pedidos/${pedido.id}`}>Ver</Link>
                </article>
              ))}
            </div>
          )}

          {puedeCargarMas && (
            <div className={styles.pieLista}>
              <button type="button" onClick={cargarPedidosAnteriores} disabled={cargandoMas}>
                {cargandoMas ? "Cargando…" : "Ver pedidos anteriores"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MisPedidos;
