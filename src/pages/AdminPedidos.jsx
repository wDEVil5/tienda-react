import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  listarPedidosAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminPedidos.module.css";

const LIMITE = 20;

// Los chips y badges usan los estados REALES del backend (no hay "Pagado" como
// estado: un pago aprobado ya mueve el pedido a PREPARANDO).
const FILTROS = [
  { valor: "", etiqueta: "Todos" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "PREPARANDO", etiqueta: "Preparando" },
  { valor: "LISTO_PARA_RETIRO", etiqueta: "Listos" },
  { valor: "ENVIADO", etiqueta: "Enviados" },
  { valor: "ENTREGADO", etiqueta: "Entregados" },
  { valor: "CANCELADO", etiqueta: "Cancelados" },
];

const ETIQUETA_ESTADO = {
  PENDIENTE: "Pendiente",
  PREPARANDO: "Preparando",
  LISTO_PARA_RETIRO: "Listo para retiro",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const CLASE_ESTADO = {
  PENDIENTE: styles.estadoPendiente,
  PREPARANDO: styles.estadoPreparando,
  LISTO_PARA_RETIRO: styles.estadoPreparando,
  ENVIADO: styles.estadoEnviado,
  ENTREGADO: styles.estadoEntregado,
  CANCELADO: styles.estadoCancelado,
};

const MONEDA_CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const FECHA = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function referencia(numero) {
  return `#SE-${numero}`;
}

export default function AdminPedidos() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [pedidos, setPedidos] = useState([]);
  const [meta, setMeta] = useState(null);
  const [estado, setEstado] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
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
    return () => { vigente = false; };
  }, [intentoAcceso]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;

    listarPedidosAdmin({ page: 1, limit: LIMITE, estado: estado || undefined })
      .then((resultado) => {
        if (!vigente) return;
        const data = Array.isArray(resultado.data) ? resultado.data : [];
        setPedidos(data);
        setMeta(resultado.meta);
        // Conserva la selección si sigue en la lista; si no, selecciona el primero.
        setSeleccionado((actual) =>
          actual && data.some((pedido) => pedido.id === actual) ? actual : data[0]?.id ?? null,
        );
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
  }, [usuario, estado, intento]);

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
    // El acceso del personal vive en /admin/productos; allí se inicia sesión.
    return <Navigate to="/admin/productos" replace />;
  }

  const seleccion = pedidos.find((pedido) => pedido.id === seleccionado) ?? null;

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Pedidos">
        <header className={styles.cabecera}>
          <h1>Pedidos</h1>
          <div className={styles.acciones}>
            <label className={styles.buscar}>
              <span className={styles.srOnly}>Buscar por número o cliente</span>
              <input
                type="search"
                placeholder="Buscar por número o cliente"
                disabled
                title="Búsqueda disponible en un próximo checkpoint."
              />
            </label>
            <button
              className={styles.exportar}
              type="button"
              disabled
              title="Exportar CSV disponible en un próximo checkpoint."
            >
              Exportar CSV
            </button>
          </div>
        </header>

        <div className={styles.cuerpo}>
          <div className={styles.columnaLista}>
            <div className={styles.filtros} aria-label="Filtrar pedidos por estado">
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
                  }}
                >
                  {filtro.etiqueta}
                  {estado === filtro.valor && meta ? ` ${meta.total}` : ""}
                </button>
              ))}
            </div>

            <div className={styles.lista} aria-label="Lista de pedidos">
              {cargando ? (
                <p className={styles.estadoLista} role="status">Cargando pedidos…</p>
              ) : error ? (
                <div className={styles.estadoLista} role="alert">
                  <strong>No pudimos cargar los pedidos</strong>
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
              ) : pedidos.length === 0 ? (
                <div className={styles.estadoLista}>
                  <strong>No hay pedidos para mostrar</strong>
                  <span>Prueba con otro filtro de estado.</span>
                </div>
              ) : (
                pedidos.map((pedido) => (
                  <button
                    key={pedido.id}
                    className={`${styles.fila} ${pedido.id === seleccionado ? styles.filaActiva : ""}`}
                    type="button"
                    aria-current={pedido.id === seleccionado ? "true" : undefined}
                    onClick={() => setSeleccionado(pedido.id)}
                  >
                    <span className={styles.filaPrincipal}>
                      <span className={styles.numero}>{referencia(pedido.numero)}</span>
                      <span className={styles.cliente}>
                        {pedido.contactoNombre} · {FECHA.format(new Date(pedido.createdAt))}
                      </span>
                    </span>
                    <span className={`${styles.badge} ${CLASE_ESTADO[pedido.estado] ?? ""}`}>
                      {ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado}
                    </span>
                    <span className={styles.total}>{MONEDA_CLP.format(pedido.total)}</span>
                  </button>
                ))
              )}
            </div>

            {!cargando && !error && pedidos.length > 0 && (
              <footer className={styles.pie}>
                Mostrando {pedidos.length} de {meta?.total ?? pedidos.length}
              </footer>
            )}
          </div>

          <aside className={styles.detalle} aria-label="Detalle del pedido">
            {seleccion ? (
              <div className={styles.detalleContenido}>
                <div className={styles.detalleCabecera}>
                  <span className={styles.numeroDetalle}>{referencia(seleccion.numero)}</span>
                  <span className={`${styles.badge} ${CLASE_ESTADO[seleccion.estado] ?? ""}`}>
                    {ETIQUETA_ESTADO[seleccion.estado] ?? seleccion.estado}
                  </span>
                </div>
                <p className={styles.detalleCliente}>{seleccion.contactoNombre}</p>
                <p className={styles.detalleMeta}>
                  {seleccion.cantidadUnidades} {seleccion.cantidadUnidades === 1 ? "unidad" : "unidades"}
                  {seleccion.comuna ? ` · ${seleccion.comuna}` : " · Retiro en tienda"}
                </p>
                <p className={styles.detalleTotal}>{MONEDA_CLP.format(seleccion.total)}</p>
                <p className={styles.detalleNota}>
                  El detalle completo (contacto, ítems, pago y cambio de estado) llega en el
                  próximo checkpoint.
                </p>
              </div>
            ) : (
              <p className={styles.detalleVacio}>Selecciona un pedido para ver su detalle.</p>
            )}
          </aside>
        </div>
      </AdminShell>
    </main>
  );
}
