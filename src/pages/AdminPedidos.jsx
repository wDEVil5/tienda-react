import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useSearchParams } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import { useReglas } from "../context/ReglasContext.jsx";
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

// Ventana de entrega a nivel tienda (igual para todos los despachos). Constante
// por ahora; se vuelve dinámica cuando exista una regla/campo real.
const HORARIO_ENTREGA = "Lun a Vie · 09:00 a 18:00";

// Progresión de estados por modalidad, para el stepper de "Estado del pedido".
const FLUJO_ESTADOS = {
  DESPACHO: ["PENDIENTE", "PREPARANDO", "ENVIADO", "ENTREGADO"],
  RETIRO: ["PENDIENTE", "PREPARANDO", "LISTO_PARA_RETIRO", "ENTREGADO"],
};

function iniciales(nombre) {
  return (nombre ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function tipoEnvio(modalidad) {
  return modalidad === "DESPACHO" ? "Despacho a domicilio" : "Retiro en tienda";
}

function lineaDireccion(direccion) {
  return [direccion.calle, direccion.comuna, direccion.region].filter(Boolean).join(", ");
}

// Arma los pasos del stepper (hecho / actual / pendiente) con su fecha, tomada de
// los eventos. El primer paso se muestra como "Pagado" cuando hay pago aprobado.
function construirPasos(detalle, pagoAprobado) {
  const flujo = FLUJO_ESTADOS[detalle.modalidad] ?? FLUJO_ESTADOS.DESPACHO;
  const indiceActual = flujo.indexOf(detalle.estado);
  const fechaDe = new Map((detalle.eventos ?? []).map((evento) => [evento.estado, evento.createdAt]));
  return flujo.map((estado, indice) => {
    const primero = indice === 0;
    const fecha = primero && pagoAprobado ? pagoAprobado.updatedAt : fechaDe.get(estado);
    const hecho = indiceActual > indice;
    const actual = indiceActual === indice;
    return {
      estado,
      label: primero && pagoAprobado ? "Pagado" : ETIQUETA_ESTADO[estado],
      hecho,
      actual,
      fecha: (hecho || actual) && fecha ? FECHA.format(new Date(fecha)) : null,
    };
  });
}

// Iconos inline (trazo, 24×24) — sin dependencias ni estilos inline.
function Ico({ d, size = 16, relleno = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={relleno ? "currentColor" : "none"}
      stroke={relleno ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}
const ICO_USUARIO = (
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
);
const ICO_CAMION = (
  <>
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </>
);
const ICO_MAIL = (
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </>
);
const ICO_TEL = (
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
);
const ICO_CHECK = <path d="M20 6 9 17l-5-5" />;
const ICO_ESTRELLA = (
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
);
const ICO_CASA = (
  <>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </>
);
const ICO_TIENDA = (
  <>
    <path d="M3 9 4.5 3h15L21 9" />
    <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
    <path d="M3 9h18" />
  </>
);
const ICO_CALENDARIO = (
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </>
);
const ICO_BOLSA = (
  <>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </>
);
const ICO_BILLETERA = (
  <>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
  </>
);
const ICO_INFO = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </>
);
const ICO_AVION = (
  <>
    <path d="m22 2-7 20-4-9-9-4z" />
    <path d="M22 2 11 13" />
  </>
);
const ICO_BASURA = (
  <>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>
);
const ICO_DESCARGA = (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </>
);

function DetallePedido({ detalle, umbralEnvioGratis, onCambiarEstado, onImprimir, cambiando, errorCambio }) {
  const pagoAprobado = (detalle.pagos ?? []).find((pago) => pago.estado === "APROBADO");
  const transiciones = TRANSICIONES[detalle.modalidad]?.[detalle.estado] ?? [];
  const siguiente = transiciones.find((estadoDestino) => estadoDestino !== "CANCELADO") ?? null;
  const puedeCancelar = transiciones.includes("CANCELADO");
  const stats = detalle.cliente;
  const cancelado = detalle.estado === "CANCELADO";
  const pasos = cancelado ? [] : construirPasos(detalle, pagoAprobado);

  return (
    <div className={styles.detalleContenido}>
      <header className={styles.detalleCabecera}>
        <h2 className={styles.detalleTitulo}>Detalles del Pedido {referencia(detalle.numero)}</h2>
        <div className={styles.badges}>
          {pagoAprobado && (
            <span className={styles.badgePagado}>
              <Ico d={ICO_CHECK} size={13} /> Pagado
            </span>
          )}
          <span className={`${styles.badge} ${CLASE_ESTADO[detalle.estado] ?? ""}`}>
            {ETIQUETA_ESTADO[detalle.estado] ?? detalle.estado}
          </span>
        </div>
      </header>

      <div className={styles.tarjetasInfo}>
        <section className={styles.tarjeta}>
          <h3 className={styles.tarjetaTitulo}>
            <Ico d={ICO_USUARIO} size={18} /> Información del cliente
          </h3>
          <div className={styles.clienteEncabezado}>
            <span className={styles.avatar} aria-hidden="true">{iniciales(detalle.contacto.nombre)}</span>
            <div className={styles.clienteIdentidad}>
              <span className={styles.clienteNombre}>{detalle.contacto.nombre}</span>
              {stats?.frecuente && (
                <span className={styles.badgeFrecuente}>
                  <Ico d={ICO_ESTRELLA} size={12} relleno /> Cliente frecuente
                </span>
              )}
            </div>
          </div>
          <div className={styles.clienteContacto}>
            <span className={styles.contactoLinea}>
              <Ico d={ICO_MAIL} size={15} /> {detalle.contacto.email}
            </span>
            {detalle.contacto.telefono && (
              <span className={styles.contactoLinea}>
                <Ico d={ICO_TEL} size={15} /> {detalle.contacto.telefono}
              </span>
            )}
          </div>
          {stats && (
            <div className={styles.clienteStats}>
              <div className={styles.statCaja}>
                <span className={styles.statIcono}><Ico d={ICO_BOLSA} size={18} /></span>
                <span className={styles.statTexto}>
                  <span className={styles.statLabel}>Pedidos anteriores</span>
                  <span className={styles.statValor}>{stats.pedidosAnteriores}</span>
                </span>
              </div>
              <div className={styles.statCaja}>
                <span className={styles.statIcono}><Ico d={ICO_BILLETERA} size={18} /></span>
                <span className={styles.statTexto}>
                  <span className={styles.statLabel}>Total gastado</span>
                  <span className={styles.statValor}>{MONEDA_CLP.format(stats.totalGastado)}</span>
                </span>
              </div>
            </div>
          )}
        </section>

        <section className={styles.tarjeta}>
          <h3 className={styles.tarjetaTitulo}>
            <Ico d={ICO_CAMION} size={18} /> Modalidad de envío y pago
          </h3>
          <dl className={styles.datosEnvio}>
            <div className={styles.filaEnvio}>
              <dt>Tipo de envío</dt>
              <dd>
                <Ico d={detalle.modalidad === "DESPACHO" ? ICO_CASA : ICO_TIENDA} size={15} />
                {tipoEnvio(detalle.modalidad)}
              </dd>
            </div>
            {detalle.modalidad === "DESPACHO" && detalle.direccion && (
              <>
                <div className={styles.filaEnvio}>
                  <dt>Dirección de envío</dt>
                  <dd>{lineaDireccion(detalle.direccion)}</dd>
                </div>
                {detalle.direccion.depto && (
                  <div className={styles.filaEnvio}>
                    <dt>Referencia</dt>
                    <dd>{detalle.direccion.depto}</dd>
                  </div>
                )}
                <div className={styles.filaEnvio}>
                  <dt>Horario de entrega</dt>
                  <dd>
                    <Ico d={ICO_CALENDARIO} size={15} />
                    {HORARIO_ENTREGA}
                  </dd>
                </div>
              </>
            )}
            <div className={styles.filaEnvio}>
              <dt>Método de pago</dt>
              <dd>
                {pagoAprobado ? (
                  <>
                    {nombreProveedor(pagoAprobado.proveedor)}
                    <span className={styles.chipVerificado}>Verificado</span>
                  </>
                ) : (
                  "Pendiente"
                )}
              </dd>
            </div>
            {pagoAprobado && (
              <div className={styles.filaEnvio}>
                <dt>Pago confirmado</dt>
                <dd>
                  <Ico d={ICO_CALENDARIO} size={15} />
                  {FECHA.format(new Date(pagoAprobado.updatedAt))}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className={styles.productosResumen}>
        <section className={styles.tarjeta}>
          <h3 className={styles.tarjetaTitulo}>Productos ({detalle.items.length})</h3>
          <div className={styles.tablaScroll}>
            <table className={styles.tablaProductos}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className={styles.colCant}>Cantidad</th>
                  <th className={styles.colNum}>Precio unit.</th>
                  <th className={styles.colNum}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((item, indice) => (
                  <tr key={`${item.sku}-${indice}`}>
                    <td className={styles.celdaProducto}>
                      {item.productoActual?.imagen ? (
                        <img className={styles.itemImagen} src={item.productoActual.imagen} alt="" />
                      ) : (
                        <span className={styles.itemImagenVacia} aria-hidden="true" />
                      )}
                      <span className={styles.itemNombre}>{item.nombre}</span>
                    </td>
                    <td className={styles.colCant}>{item.cantidad}</td>
                    <td className={styles.colNum}>{MONEDA_CLP.format(item.precioFinal)}</td>
                    <td className={styles.colNum}>{MONEDA_CLP.format(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.tarjeta} ${styles.tarjetaResumen}`}>
          <h3 className={styles.tarjetaTitulo}>Resumen del pedido</h3>
          <dl className={styles.totales}>
            <div>
              <dt>Subtotal</dt>
              <dd>{MONEDA_CLP.format(detalle.subtotal)}</dd>
            </div>
            {detalle.descuento > 0 && (
              <div className={styles.filaDescuento}>
                <dt>Descuento</dt>
                <dd>−{MONEDA_CLP.format(detalle.descuento)}</dd>
              </div>
            )}
            <div>
              <dt>Envío</dt>
              <dd>{detalle.costoEnvio > 0 ? MONEDA_CLP.format(detalle.costoEnvio) : "Gratis"}</dd>
            </div>
          </dl>
          <div className={styles.totalCaja}>
            <div className={styles.totalFinal}>
              <span>Total</span>
              <strong>{MONEDA_CLP.format(detalle.total)}</strong>
            </div>
            {detalle.costoEnvio === 0 && detalle.modalidad === "DESPACHO" && (
              <div className={styles.notaEnvioGratis}>
                <Ico d={ICO_CAMION} size={18} />
                <div>
                  <strong>Envío gratuito</strong>
                  <span>Por compras sobre {MONEDA_CLP.format(umbralEnvioGratis)}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className={styles.tarjeta}>
        <h3 className={styles.tarjetaTitulo}>Estado del pedido</h3>
        <p className={styles.estadoSub}>Gestiona y actualiza el estado del pedido.</p>

        {cancelado ? (
          <p className={styles.avisoCancelado}>Este pedido fue cancelado y su stock reservado se liberó.</p>
        ) : (
          <div className={styles.gestionEstado}>
            <ol className={styles.stepper}>
              {pasos.map((paso, indice) => (
                <li
                  key={paso.estado}
                  className={`${styles.paso} ${paso.hecho ? styles.pasoHecho : ""} ${paso.actual ? styles.pasoActual : ""}`}
                >
                  <span className={styles.pasoMarcador}>
                    {paso.hecho ? <Ico d={ICO_CHECK} size={13} /> : indice + 1}
                  </span>
                  <span className={styles.pasoNombre}>{paso.label}</span>
                  <span className={styles.pasoFecha}>
                    {paso.actual ? "Actual" : paso.fecha ?? "Pendiente"}
                  </span>
                </li>
              ))}
            </ol>

            {siguiente && (
              <div className={styles.accionPrimaria}>
                <div className={styles.accionResumen}>
                  <span>
                    Estado actual
                    <strong>{ETIQUETA_ESTADO[detalle.estado]}</strong>
                  </span>
                  <span className={styles.accionFlecha} aria-hidden="true">→</span>
                  <span>
                    Siguiente paso
                    <strong>Marcar como {ETIQUETA_ESTADO[siguiente].toLowerCase()}</strong>
                  </span>
                </div>
                <button
                  className={styles.botonPrimario}
                  type="button"
                  disabled={cambiando}
                  onClick={() => onCambiarEstado(siguiente)}
                >
                  <Ico d={ICO_AVION} size={16} /> Marcar como {ETIQUETA_ESTADO[siguiente].toLowerCase()}
                </button>
              </div>
            )}
          </div>
        )}

        <p className={styles.notaCorreo}>
          <Ico d={ICO_INFO} size={14} /> El cliente recibirá una notificación por correo al cambiar el estado.
        </p>
        {errorCambio && <p className={styles.errorCambio} role="alert">{errorCambio}</p>}

        <div className={styles.footerAcciones}>
          <button className={styles.botonSecundario} type="button" onClick={onImprimir}>
            <Ico d={ICO_DESCARGA} size={15} /> Descargar factura
          </button>
          {puedeCancelar && (
            <button
              className={styles.botonPeligro}
              type="button"
              disabled={cambiando}
              onClick={() => onCambiarEstado("CANCELADO")}
            >
              <Ico d={ICO_BASURA} size={15} /> Cancelar pedido
            </button>
          )}
        </div>
      </section>

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
  const reglas = useReglas();
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
    // El acceso del personal vive en su propia ruta.
    return <Navigate to="/admin/acceso" replace />;
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
                umbralEnvioGratis={reglas.envioGratisDesde}
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
