import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ajustarStockAdmin,
  ErrorAdminApi,
  listarInventarioAdmin,
  listarMovimientosStockAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminInventario.module.css";

const LIMITE = 20;

// Motivos de ajuste. CONTEO trabaja con un total absoluto (conteo físico); los
// otros dos con una cantidad que suma o resta.
const MOTIVOS = [
  { valor: "ENTRADA", etiqueta: "Entrada", ayuda: "Recepción de mercadería (suma)" },
  { valor: "MERMA", etiqueta: "Merma", ayuda: "Pérdida, daño o vencimiento (resta)" },
  { valor: "CONTEO", etiqueta: "Conteo", ayuda: "Corrige contra un conteo físico" },
];

const ETIQUETA_MOTIVO = {
  ENTRADA: "Entrada",
  MERMA: "Merma",
  CONTEO: "Conteo",
};

const FECHA_MOV = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// Calcula el delta a enviar según el motivo y lo escrito. En CONTEO el campo es
// el nuevo total → delta = total − stock actual; en el resto, cantidad con signo.
function calcularDelta(motivo, valor, stockActual) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isInteger(n) || n < 0) return null;
  if (motivo === "CONTEO") return n - stockActual;
  if (n < 1) return null;
  return motivo === "MERMA" ? -n : n;
}

function ModalAjuste({ producto, onCerrar, onAjustado }) {
  const [stockActual, setStockActual] = useState(producto.stock);
  const [motivo, setMotivo] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [errorHistorial, setErrorHistorial] = useState(null);

  // Cierre con Escape.
  useEffect(() => {
    const alPulsar = (evento) => {
      if (evento.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  // Historial al abrir.
  useEffect(() => {
    let vigente = true;
    listarMovimientosStockAdmin(producto.id)
      .then((data) => {
        if (vigente) setHistorial(Array.isArray(data) ? data : []);
      })
      .catch((errorRespuesta) => {
        if (vigente) setErrorHistorial(errorRespuesta.message);
      });
    return () => {
      vigente = false;
    };
  }, [producto.id]);

  const delta = calcularDelta(motivo, cantidad, stockActual);
  const stockResultante = delta !== null ? stockActual + delta : null;
  const invalido = delta === null || delta === 0 || stockResultante < 0;

  const etiquetaCampo = motivo === "CONTEO" ? "Nuevo total (conteo físico)" : "Cantidad";

  async function enviar(evento) {
    evento.preventDefault();
    if (invalido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const { fila, movimiento } = await ajustarStockAdmin(producto.id, {
        delta,
        motivo,
        nota: nota.trim() || undefined,
      });
      setStockActual(fila.stock);
      setHistorial((actual) => [movimiento, ...(actual ?? [])]);
      setCantidad("");
      setNota("");
      onAjustado(fila);
    } catch (errorRespuesta) {
      setError(
        errorRespuesta instanceof ErrorAdminApi
          ? errorRespuesta.message
          : "No pudimos aplicar el ajuste.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Ajustar stock de ${producto.nombre}`}>
      <button className={styles.overlayFondo} type="button" aria-label="Cerrar" onClick={onCerrar} />
      <div className={styles.modal}>
        <header className={styles.modalCabecera}>
          <div>
            <h2 className={styles.modalTitulo}>{producto.nombre}</h2>
            <span className={styles.modalSku}>{producto.sku}</span>
          </div>
          <button className={styles.cerrar} type="button" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={styles.modalStock}>
          <span className={styles.modalStockValor}>{stockActual}</span>
          <span className={styles.modalStockLabel}>en stock ahora</span>
        </div>

        <form className={styles.form} onSubmit={enviar}>
          <div className={styles.motivos}>
            {MOTIVOS.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                className={motivo === opcion.valor ? styles.motivoActivo : styles.motivo}
                aria-pressed={motivo === opcion.valor}
                onClick={() => setMotivo(opcion.valor)}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          <p className={styles.motivoAyuda}>
            {MOTIVOS.find((m) => m.valor === motivo)?.ayuda}
          </p>

          <label className={styles.campo}>
            <span>{etiquetaCampo}</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder={motivo === "CONTEO" ? String(stockActual) : "0"}
              autoFocus
            />
          </label>

          <label className={styles.campo}>
            <span>Nota (opcional)</span>
            <input
              type="text"
              maxLength={300}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: llegó pedido del proveedor"
            />
          </label>

          {stockResultante !== null && delta !== 0 && (
            <p className={`${styles.preview} ${stockResultante < 0 ? styles.previewMal : ""}`}>
              Stock resultante: <strong>{stockResultante}</strong>
              <span className={styles.previewDelta}>
                ({delta > 0 ? "+" : ""}
                {delta})
              </span>
            </p>
          )}

          {error && <p className={styles.errorForm} role="alert">{error}</p>}

          <div className={styles.formAcciones}>
            <button type="button" className={styles.botonSecundario} onClick={onCerrar}>
              Cerrar
            </button>
            <button type="submit" className={styles.botonPrimario} disabled={invalido || enviando}>
              {enviando ? "Aplicando…" : "Aplicar ajuste"}
            </button>
          </div>
        </form>

        <section className={styles.historial}>
          <h3 className={styles.historialTitulo}>Movimientos recientes</h3>
          {errorHistorial ? (
            <p className={styles.historialVacio} role="alert">{errorHistorial}</p>
          ) : historial === null ? (
            <p className={styles.historialVacio} role="status">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className={styles.historialVacio}>Sin movimientos manuales todavía.</p>
          ) : (
            <ul className={styles.movimientos}>
              {historial.map((mov) => (
                <li key={mov.id} className={styles.movimiento}>
                  <span
                    className={`${styles.movDelta} ${mov.delta > 0 ? styles.movMas : styles.movMenos}`}
                  >
                    {mov.delta > 0 ? "+" : ""}
                    {mov.delta}
                  </span>
                  <span className={styles.movInfo}>
                    <span className={styles.movMotivo}>
                      {ETIQUETA_MOTIVO[mov.motivo] ?? mov.motivo}
                      {mov.nota && <span className={styles.movNota}> · {mov.nota}</span>}
                    </span>
                    <span className={styles.movMeta}>
                      {FECHA_MOV.format(new Date(mov.createdAt))}
                      {mov.usuario?.nombre && ` · ${mov.usuario.nombre}`} · quedó en {mov.stockResultante}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}

const ETIQUETA_STOCK = {
  DISPONIBLE: "Disponible",
  ULTIMAS_UNIDADES: "Últimas unidades",
  AGOTADO: "Agotado",
};

const CLASE_STOCK = {
  DISPONIBLE: styles.stockDisponible,
  ULTIMAS_UNIDADES: styles.stockBajo,
  AGOTADO: styles.stockAgotado,
};

const ETIQUETA_PRODUCTO = {
  PUBLICADO: "Publicado",
  BORRADOR: "Borrador",
};

export default function AdminInventario() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [page, setPage] = useState(1);
  const [bajoStock, setBajoStock] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [ajustando, setAjustando] = useState(null);
  const [huboCambios, setHuboCambios] = useState(false);

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
    return () => {
      vigente = false;
    };
  }, [intentoAcceso]);

  // Debounce de la búsqueda (350 ms) y vuelta a la página 1.
  useEffect(() => {
    if (busqueda === busquedaAplicada) return undefined;
    const temporizador = setTimeout(() => {
      setCargando(true);
      setBusquedaAplicada(busqueda);
      setPage(1);
    }, 350);
    return () => clearTimeout(temporizador);
  }, [busqueda, busquedaAplicada]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;

    listarInventarioAdmin({
      page,
      limit: LIMITE,
      q: busquedaAplicada || undefined,
      bajoStock,
    })
      .then((resultado) => {
        if (!vigente) return;
        setFilas(Array.isArray(resultado.data) ? resultado.data : []);
        setMeta(resultado.meta);
        setResumen(resultado.resumen ?? null);
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

    return () => {
      vigente = false;
    };
  }, [usuario, page, busquedaAplicada, bajoStock, intento]);

  if (usuario === undefined) {
    return (
      <main className={styles.acceso}>
        <p role="status">Comprobando acceso al panel…</p>
      </main>
    );
  }

  if (!usuario) {
    if (errorAcceso) {
      return (
        <main className={styles.acceso}>
          <section className={styles.accesoCaja} role="alert">
            <h1>No pudimos conectar</h1>
            <p>{errorAcceso}</p>
            <button
              type="button"
              onClick={() => {
                setUsuario(undefined);
                setErrorAcceso(null);
                setIntentoAcceso((valor) => valor + 1);
              }}
            >
              Reintentar
            </button>
          </section>
        </main>
      );
    }
    return <Navigate to="/admin/acceso" replace />;
  }

  const totalPaginas = meta?.totalPages ?? 1;

  // Actualiza la fila en sitio para feedback inmediato y marca que hubo cambios
  // (al cerrar el modal se recarga la lista para refrescar el resumen/orden).
  function alAjustar(fila) {
    setFilas((actuales) => actuales.map((f) => (f.id === fila.id ? fila : f)));
    setHuboCambios(true);
  }

  function cerrarModal() {
    setAjustando(null);
    if (huboCambios) {
      setHuboCambios(false);
      setIntento((valor) => valor + 1); // recarga lista + resumen
    }
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Inventario">
        <header className={styles.cabecera}>
          <div>
            <h1>Inventario</h1>
            <p className={styles.subtitulo}>Stock disponible por producto y alertas de reposición.</p>
          </div>
          <label className={styles.buscar}>
            <span className={styles.srOnly}>Buscar por nombre o SKU</span>
            <input
              type="search"
              placeholder="Buscar por nombre o SKU"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </label>
        </header>

        <div className={styles.cuerpo}>
          {resumen && (
            <div className={styles.tarjetas}>
              <div className={styles.tarjeta}>
                <span className={styles.tarjetaValor}>{resumen.total}</span>
                <span className={styles.tarjetaLabel}>Productos activos</span>
              </div>
              <div className={styles.tarjeta}>
                <span className={`${styles.tarjetaValor} ${styles.valorOk}`}>{resumen.disponibles}</span>
                <span className={styles.tarjetaLabel}>Con stock</span>
              </div>
              <div className={styles.tarjeta}>
                <span className={`${styles.tarjetaValor} ${styles.valorBajo}`}>{resumen.bajos}</span>
                <span className={styles.tarjetaLabel}>Últimas unidades</span>
              </div>
              <div className={styles.tarjeta}>
                <span className={`${styles.tarjetaValor} ${styles.valorAgotado}`}>{resumen.agotados}</span>
                <span className={styles.tarjetaLabel}>Agotados</span>
              </div>
            </div>
          )}

          <div className={styles.barraFiltros}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={bajoStock}
                onChange={(evento) => {
                  setCargando(true);
                  setPage(1);
                  setBajoStock(evento.target.checked);
                }}
              />
              Solo bajo stock
            </label>
            {meta && !cargando && !error && (
              <span className={styles.conteo}>
                {meta.total} {meta.total === 1 ? "producto" : "productos"}
              </span>
            )}
          </div>

          <div className={styles.tablaEnvoltorio}>
            {cargando ? (
              <p className={styles.estado} role="status">Cargando inventario…</p>
            ) : error ? (
              <div className={styles.estado} role="alert">
                <strong>No pudimos cargar el inventario</strong>
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
            ) : filas.length === 0 ? (
              <div className={styles.estado}>
                <strong>No hay productos para mostrar</strong>
                <span>
                  {busquedaAplicada
                    ? `Sin resultados para «${busquedaAplicada}».`
                    : bajoStock
                      ? "Ningún producto está bajo stock. 🎉"
                      : "Aún no hay productos activos."}
                </span>
              </div>
            ) : (
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className={styles.colNum}>Stock</th>
                    <th className={styles.colNum}>Reservado</th>
                    <th className={styles.colNum}>Disponible</th>
                    <th>Estado</th>
                    <th className={styles.colAccion}><span className={styles.srOnly}>Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.id}>
                      <td className={styles.celdaProducto}>
                        <span className={styles.nombre}>{fila.nombre}</span>
                        <span className={styles.metaProducto}>
                          <span className={styles.sku}>{fila.sku}</span>
                          {fila.estadoProducto === "BORRADOR" && (
                            <span className={styles.chipBorrador}>
                              {ETIQUETA_PRODUCTO[fila.estadoProducto]}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={styles.colNum}>{fila.stock}</td>
                      <td className={`${styles.colNum} ${styles.reservado}`}>
                        {fila.stockReservado > 0 ? `−${fila.stockReservado}` : "—"}
                      </td>
                      <td className={`${styles.colNum} ${styles.disponible}`}>{fila.disponible}</td>
                      <td>
                        <span className={`${styles.badge} ${CLASE_STOCK[fila.estadoStock] ?? ""}`}>
                          {ETIQUETA_STOCK[fila.estadoStock] ?? fila.estadoStock}
                        </span>
                      </td>
                      <td className={styles.colAccion}>
                        <button
                          type="button"
                          className={styles.ajustar}
                          onClick={() => setAjustando(fila)}
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!cargando && !error && filas.length > 0 && totalPaginas > 1 && (
            <footer className={styles.pie}>
              <span>
                Página {meta?.page ?? page} de {totalPaginas}
              </span>
              <div className={styles.paginacion}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setCargando(true);
                    setPage((valor) => Math.max(1, valor - 1));
                  }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPaginas}
                  onClick={() => {
                    setCargando(true);
                    setPage((valor) => valor + 1);
                  }}
                >
                  Siguiente
                </button>
              </div>
            </footer>
          )}
        </div>

        {ajustando && (
          <ModalAjuste producto={ajustando} onCerrar={cerrarModal} onAjustado={alAjustar} />
        )}
      </AdminShell>
    </main>
  );
}
