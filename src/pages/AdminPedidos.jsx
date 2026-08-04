import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  listarPedidosAdmin,
  obtenerPedidoAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminPedidos.module.css";

const LIMITE = 20;

// Los chips y badges usan los estados REALES del backend (no hay "Pagado" como
// estado: un pago aprobado ya mueve el pedido a PREPARANDO). "Pagado" se muestra
// como un indicador aparte, derivado del pago aprobado.
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

const PROVEEDOR = { mercadopago: "Mercado Pago", fake: "Pago de prueba" };

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
const HORA = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" });

function referencia(numero) {
  return `#SE-${numero}`;
}

function nombreProveedor(proveedor) {
  return PROVEEDOR[proveedor] ?? proveedor;
}

function textoEntrega(direccion) {
  if (!direccion) return "Retiro en tienda";
  const linea = [direccion.calle, direccion.depto].filter(Boolean).join(", ");
  return `Despacho: ${linea}${direccion.comuna ? ` · ${direccion.comuna}` : ""}`;
}

function DetallePedido({ detalle }) {
  const pagoAprobado = (detalle.pagos ?? []).find((pago) => pago.estado === "APROBADO");

  return (
    <div className={styles.detalleContenido}>
      <div className={styles.detalleCabecera}>
        <span className={styles.numeroDetalle}>{referencia(detalle.numero)}</span>
        <span className={styles.badges}>
          {pagoAprobado && <span className={`${styles.badge} ${styles.estadoPagado}`}>Pagado</span>}
          <span className={`${styles.badge} ${CLASE_ESTADO[detalle.estado] ?? ""}`}>
            {ETIQUETA_ESTADO[detalle.estado] ?? detalle.estado}
          </span>
        </span>
      </div>

      <p className={styles.detalleCliente}>{detalle.contacto.nombre}</p>
      <div className={styles.detalleDatos}>
        {detalle.contacto.telefono && <span>{detalle.contacto.telefono}</span>}
        <span>{detalle.contacto.email}</span>
        <span>{textoEntrega(detalle.direccion)}</span>
        {pagoAprobado && (
          <span>
            {nombreProveedor(pagoAprobado.proveedor)} · verificado{" "}
            {HORA.format(new Date(pagoAprobado.updatedAt))}
          </span>
        )}
      </div>

      <ul className={styles.items}>
        {detalle.items.map((item, indice) => (
          <li className={styles.item} key={`${item.sku}-${indice}`}>
            {item.productoActual?.imagen ? (
              <img className={styles.itemImagen} src={item.productoActual.imagen} alt="" />
            ) : (
              <span className={styles.itemImagenVacia} aria-hidden="true" />
            )}
            <span className={styles.itemNombre}>
              {item.nombre}
              <small>× {item.cantidad}</small>
            </span>
            <span className={styles.itemSubtotal}>{MONEDA_CLP.format(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <dl className={styles.totales}>
        <div>
          <dt>Subtotal</dt>
          <dd>{MONEDA_CLP.format(detalle.subtotal)}</dd>
        </div>
        {detalle.descuento > 0 && (
          <div>
            <dt>Descuento</dt>
            <dd>−{MONEDA_CLP.format(detalle.descuento)}</dd>
          </div>
        )}
        <div>
          <dt>Envío</dt>
          <dd>{detalle.costoEnvio > 0 ? MONEDA_CLP.format(detalle.costoEnvio) : "Gratis"}</dd>
        </div>
        <div className={styles.totalFinal}>
          <dt>{pagoAprobado ? "Total pagado" : "Total"}</dt>
          <dd>{MONEDA_CLP.format(detalle.total)}</dd>
        </div>
      </dl>
    </div>
  );
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

  const [detalle, setDetalle] = useState(null);
  const [errorDetalle, setErrorDetalle] = useState(null);
  const [intentoDetalle, setIntentoDetalle] = useState(0);

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

  useEffect(() => {
    if (!usuario || !seleccionado) return undefined;
    let vigente = true;

    obtenerPedidoAdmin(seleccionado)
      .then((data) => {
        if (!vigente) return;
        setDetalle(data);
        setErrorDetalle(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setErrorDetalle({ id: seleccionado, mensaje: errorRespuesta.message });
      });

    return () => { vigente = false; };
  }, [usuario, seleccionado, intentoDetalle]);

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

  // Estado del detalle DERIVADO (sin setState en el efecto): "listo" cuando el
  // detalle cargado corresponde a la selección actual; el error se acota a su id.
  const detalleListo = detalle && detalle.id === seleccionado;
  const errorActual =
    errorDetalle && errorDetalle.id === seleccionado ? errorDetalle.mensaje : null;

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
            {!seleccionado ? (
              <p className={styles.detalleVacio}>Selecciona un pedido para ver su detalle.</p>
            ) : errorActual ? (
              <div className={styles.detalleEstado} role="alert">
                <strong>No pudimos cargar el detalle</strong>
                <span>{errorActual}</span>
                <button type="button" onClick={() => setIntentoDetalle((valor) => valor + 1)}>
                  Reintentar
                </button>
              </div>
            ) : detalleListo ? (
              <DetallePedido detalle={detalle} />
            ) : (
              <p className={styles.detalleEstado} role="status">Cargando detalle…</p>
            )}
          </aside>
        </div>
      </AdminShell>
    </main>
  );
}
