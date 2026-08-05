import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useSearchParams } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  cambiarEstadoPedidoAdmin,
  ErrorAdminApi,
  listarPedidosAdmin,
  obtenerPedidoAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminPedidos.module.css";

const LIMITE = 20;

// Estados válidos para el filtro (incluye "" = Todos). Se usa para aceptar el
// estado que llega por la URL (drill-down desde el Resumen: ?estado=PENDIENTE).
const ESTADOS_VALIDOS = new Set([
  "",
  "PENDIENTE",
  "PREPARANDO",
  "LISTO_PARA_RETIRO",
  "ENVIADO",
  "ENTREGADO",
  "CANCELADO",
]);

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

// Transiciones válidas por modalidad — reflejan la máquina de estados del backend
// (pedidos.estados.js). El servidor sigue siendo la autoridad; esto solo evita
// ofrecer saltos ilegales. CANCELADO es alcanzable desde cualquier estado no final.
const TRANSICIONES = {
  RETIRO: {
    PENDIENTE: ["PREPARANDO", "CANCELADO"],
    PREPARANDO: ["LISTO_PARA_RETIRO", "CANCELADO"],
    LISTO_PARA_RETIRO: ["ENTREGADO", "CANCELADO"],
    ENTREGADO: [],
    CANCELADO: [],
  },
  DESPACHO: {
    PENDIENTE: ["PREPARANDO", "CANCELADO"],
    PREPARANDO: ["ENVIADO", "CANCELADO"],
    ENVIADO: ["ENTREGADO", "CANCELADO"],
    ENTREGADO: [],
    CANCELADO: [],
  },
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
const HORA = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" });
const FECHA_LARGA = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const FECHA_CSV = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

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

// Exportación CSV de la lista (los resúmenes que ya entrega el backend). El total
// va como entero, no formateado, para que la planilla lo trate como número.
const COLUMNAS_CSV = [
  "Número", "Fecha", "Cliente", "Estado", "Entrega", "Comuna", "Productos", "Unidades", "Total",
];

function filaCsv(pedido) {
  return [
    referencia(pedido.numero),
    FECHA_CSV.format(new Date(pedido.createdAt)),
    pedido.contactoNombre,
    ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado,
    pedido.modalidad === "DESPACHO" ? "Despacho" : "Retiro",
    pedido.comuna ?? "",
    pedido.cantidadProductos,
    pedido.cantidadUnidades,
    pedido.total,
  ];
}

function generarCsv(pedidos) {
  // Cada celda entre comillas y con las comillas internas duplicadas: así comas,
  // saltos de línea o comillas en un nombre no rompen las columnas.
  const escapar = (valor) => `"${String(valor).replaceAll('"', '""')}"`;
  const lineas = [COLUMNAS_CSV, ...pedidos.map(filaCsv)].map((fila) =>
    fila.map(escapar).join(","),
  );
  // El prefijo BOM (\uFEFF) hace que Excel lea el UTF-8 y muestre bien acentos y ñ.
  return `\uFEFF${lineas.join("\r\n")}`;
}

function descargarArchivo(texto, nombre) {
  const blob = new Blob([texto], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function DetallePedido({ detalle, onCambiarEstado, onImprimir, cambiando, errorCambio }) {
  const pagoAprobado = (detalle.pagos ?? []).find((pago) => pago.estado === "APROBADO");
  const transiciones = TRANSICIONES[detalle.modalidad]?.[detalle.estado] ?? [];
  const avances = transiciones.filter((estadoDestino) => estadoDestino !== "CANCELADO");
  const puedeCancelar = transiciones.includes("CANCELADO");

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

      <div className={styles.cambiarEstado}>
        {avances.length > 0 && (
          <>
            <p className={styles.accionesTitulo}>Cambiar estado</p>
            <div className={styles.accionesBotones}>
              {avances.map((estadoDestino) => (
                <button
                  key={estadoDestino}
                  className={styles.botonAvance}
                  type="button"
                  disabled={cambiando}
                  onClick={() => onCambiarEstado(estadoDestino)}
                >
                  {ETIQUETA_ESTADO[estadoDestino]}
                </button>
              ))}
            </div>
            <p className={styles.notaCorreo}>
              Al cambiar el estado, el cliente recibe un aviso por correo.
            </p>
          </>
        )}
        {errorCambio && <p className={styles.errorCambio} role="alert">{errorCambio}</p>}
        <div className={styles.accionesSecundarias}>
          <button className={styles.botonImprimir} type="button" onClick={onImprimir}>
            Imprimir
          </button>
          {puedeCancelar && (
            <button
              className={styles.botonCancelar}
              type="button"
              disabled={cambiando}
              onClick={() => onCambiarEstado("CANCELADO")}
            >
              Cancelar pedido
            </button>
          )}
        </div>
      </div>

      {/* Comanda para imprimir: se monta oculta en el <body> (portal) y solo se
          ve al imprimir. Refleja el pedido seleccionado (ver estilos en index.css). */}
      {createPortal(
        <div className="hoja-impresion" aria-hidden="true">
          <h1>SumarketExpress · Pedido {referencia(detalle.numero)}</h1>
          <p className="hoja-sub">
            {FECHA_LARGA.format(new Date(detalle.createdAt))} ·{" "}
            {ETIQUETA_ESTADO[detalle.estado] ?? detalle.estado}
            {pagoAprobado ? " · Pagado" : ""}
          </p>
          <dl className="hoja-datos">
            <dt>Cliente</dt>
            <dd>{detalle.contacto.nombre}</dd>
            <dt>Contacto</dt>
            <dd>
              {[detalle.contacto.telefono, detalle.contacto.email].filter(Boolean).join(" · ")}
            </dd>
            <dt>Entrega</dt>
            <dd>{textoEntrega(detalle.direccion)}</dd>
          </dl>
          <table className="hoja-items">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detalle.items.map((item, indice) => (
                <tr key={`${item.sku}-${indice}`}>
                  <td>{item.nombre}</td>
                  <td>{item.cantidad}</td>
                  <td>{MONEDA_CLP.format(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hoja-total">Total: {MONEDA_CLP.format(detalle.total)}</p>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function AdminPedidos() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [searchParams] = useSearchParams();
  const [pedidos, setPedidos] = useState([]);
  const [meta, setMeta] = useState(null);
  // Estado inicial del filtro: el de la URL si es válido (drill-down), o Todos.
  const [estado, setEstado] = useState(() => {
    const inicial = searchParams.get("estado");
    return inicial && ESTADOS_VALIDOS.has(inicial) ? inicial : "";
  });
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState(null);

  const [detalle, setDetalle] = useState(null);
  const [errorDetalle, setErrorDetalle] = useState(null);
  const [intentoDetalle, setIntentoDetalle] = useState(0);
  const [cambiando, setCambiando] = useState(false);
  const [errorCambio, setErrorCambio] = useState(null);

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

  // Debounce: aplica lo escrito 350 ms después de la última tecla, para no
  // disparar una petición por cada pulsación. El setState va dentro del timer
  // (asíncrono), no en el cuerpo del efecto.
  useEffect(() => {
    if (busqueda === busquedaAplicada) return undefined;
    const temporizador = setTimeout(() => {
      setCargando(true);
      setBusquedaAplicada(busqueda);
    }, 350);
    return () => clearTimeout(temporizador);
  }, [busqueda, busquedaAplicada]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;

    listarPedidosAdmin({
      page: 1,
      limit: LIMITE,
      estado: estado || undefined,
      q: busquedaAplicada || undefined,
    })
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
  }, [usuario, estado, busquedaAplicada, intento]);

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
  const errorCambioActual =
    errorCambio && errorCambio.id === seleccionado ? errorCambio.mensaje : null;

  // Conteos por estado para los chips. Vienen del backend (ignoran el filtro de
  // estado, respetan la búsqueda). "Todos" es la suma; los demás, su estado.
  const conteos = meta?.conteos ?? null;
  const totalGeneral = conteos
    ? Object.values(conteos).reduce((suma, cantidad) => suma + cantidad, 0)
    : null;
  const conteoDe = (valor) => {
    if (!conteos) return null;
    return valor === "" ? totalGeneral : conteos[valor] ?? 0;
  };

  async function cambiarEstado(nuevoEstado) {
    if (!detalle) return;
    if (
      nuevoEstado === "CANCELADO" &&
      !window.confirm("¿Cancelar este pedido? Se liberará el stock reservado.")
    ) {
      return;
    }

    setCambiando(true);
    setErrorCambio(null);
    try {
      const actualizado = await cambiarEstadoPedidoAdmin(detalle.id, nuevoEstado);
      setDetalle(actualizado);
      setIntento((valor) => valor + 1); // reconcilia la lista (badges y filtros)
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setErrorCambio({
        id: detalle.id,
        mensaje:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos cambiar el estado del pedido.",
      });
    } finally {
      setCambiando(false);
    }
  }

  // Exporta la lista TAL COMO se ve (mismo estado + búsqueda). La lista en
  // pantalla está paginada; aquí recorremos todas las páginas para no exportar
  // solo las 20 visibles.
  async function exportarCsv() {
    setExportando(true);
    setErrorExportar(null);
    try {
      const todos = [];
      let page = 1;
      let totalPages = 1;
      do {
        const resultado = await listarPedidosAdmin({
          page,
          limit: 100,
          estado: estado || undefined,
          q: busquedaAplicada || undefined,
        });
        todos.push(...(resultado.data ?? []));
        totalPages = resultado.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);

      if (todos.length === 0) return;
      descargarArchivo(generarCsv(todos), `pedidos-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setErrorExportar("No pudimos exportar. Inténtalo de nuevo.");
    } finally {
      setExportando(false);
    }
  }

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
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </label>
            <button
              className={styles.exportar}
              type="button"
              onClick={exportarCsv}
              disabled={exportando || cargando || pedidos.length === 0}
              title={
                pedidos.length === 0
                  ? "No hay pedidos para exportar."
                  : "Descargar la lista filtrada en CSV"
              }
            >
              {exportando ? "Exportando…" : "Exportar CSV"}
            </button>
            {errorExportar && (
              <span className={styles.errorExportar} role="alert">
                {errorExportar}
              </span>
            )}
          </div>
        </header>

        <div className={styles.cuerpo}>
          <div className={styles.columnaLista}>
            <div className={styles.filtros} aria-label="Filtrar pedidos por estado">
              {FILTROS.map((filtro) => {
                const cantidad = conteoDe(filtro.valor);
                return (
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
                    {cantidad !== null && (
                      <span className={styles.filtroConteo}>{cantidad}</span>
                    )}
                  </button>
                );
              })}
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
                  <span>
                    {busquedaAplicada
                      ? `Sin resultados para «${busquedaAplicada}».`
                      : "Prueba con otro filtro de estado."}
                  </span>
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
              <DetallePedido
                detalle={detalle}
                onCambiarEstado={cambiarEstado}
                onImprimir={() => window.print()}
                cambiando={cambiando}
                errorCambio={errorCambioActual}
              />
            ) : (
              <p className={styles.detalleEstado} role="status">Cargando detalle…</p>
            )}
          </aside>
        </div>
      </AdminShell>
    </main>
  );
}
