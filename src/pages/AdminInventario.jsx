import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  listarInventarioAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminInventario.module.css";

const LIMITE = 20;

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
      </AdminShell>
    </main>
  );
}
