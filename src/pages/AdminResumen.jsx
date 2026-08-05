import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  cambiarEstadoPedidoAdmin,
  ErrorAdminApi,
  obtenerMasVendidosAdmin,
  obtenerResumenAdmin,
  obtenerSesionAdmin,
  obtenerVentasDiariasAdmin,
} from "../services/adminApi.js";
import styles from "./AdminResumen.module.css";

// Opciones del selector "Este mes ▾". Los valores coinciden con los que valida
// el backend (PERIODOS_RESUMEN).
const PERIODOS = [
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "mes-pasado", etiqueta: "Mes pasado" },
  { valor: "semana", etiqueta: "Últimos 7 días" },
  { valor: "hoy", etiqueta: "Hoy" },
];

const MONEDA_CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const MES = new Intl.DateTimeFormat("es-CL", { month: "long" });
const FECHA_DIA = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" });

// Monto compacto para el centro del donut ($20.9k). Bajo mil usa el formato pleno.
function montoCorto(valor) {
  if (valor >= 1000) {
    const miles = valor / 1000;
    return `$${miles % 1 === 0 ? miles.toFixed(0) : miles.toFixed(1)}k`;
  }
  return MONEDA_CLP.format(valor);
}

// Título grande del tablero, derivado del período (estable durante la carga).
function tituloPeriodo(periodo) {
  if (periodo === "hoy") return "Hoy";
  if (periodo === "semana") return "Últimos 7 días";
  const base = new Date();
  if (periodo === "mes-pasado") base.setMonth(base.getMonth() - 1);
  const mes = MES.format(base);
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${base.getFullYear()}`;
}

function subtituloPeriodo(periodo) {
  if (periodo === "hoy") return "Resumen operativo de hoy";
  if (periodo === "semana") return "Resumen operativo de los últimos 7 días";
  if (periodo === "mes-pasado") return "Resumen operativo del mes pasado";
  return "Resumen operativo del mes en curso";
}

function periodoCorto(periodo) {
  if (periodo === "hoy") return "hoy";
  if (periodo === "semana") return "7 días";
  if (periodo === "mes-pasado") return "mes ant.";
  return "mes";
}

function etiquetaVentas(periodo) {
  if (periodo === "hoy") return "Ventas de hoy";
  if (periodo === "semana") return "Ventas (7 días)";
  return "Ventas del mes";
}

function referencia(numero) {
  return `#SE-${numero}`;
}

// Iniciales del contacto para el avatar de la tabla de acción.
function iniciales(nombre) {
  const limpio = (nombre ?? "").trim();
  if (!limpio) return "?";
  return limpio
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

// Drill-down del KPI "Stock crítico": lleva al panel "Por reponer" de la misma
// página (scroll suave dentro del área de contenido del shell).
function irAReponer() {
  document.getElementById("por-reponer")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Delta contra el período anterior. null = sin base para comparar (no fingimos
// un +∞ ni un 100% desde cero): lo decimos con honestidad.
function textoVariacion(valor, comparacion) {
  if (valor === null || valor === undefined) {
    return { texto: `Sin datos de ${comparacion}`, tono: "muted" };
  }
  return {
    texto: `${valor > 0 ? "+" : ""}${valor}% vs ${comparacion}`,
    tono: valor > 0 ? "up" : valor < 0 ? "down" : "muted",
  };
}

/* ---------- Iconos inline (sin lucide) ---------- */

function IconoChevron({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoMas() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconoFlecha() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoAlerta() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4.5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconoRecargar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 11a8 8 0 10-.5 4M20 5v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Sparkline decorativo de las KPI (dirección = dato real) ---------- */

function Sparkline({ kind, color, id }) {
  if (kind === "down") {
    return (
      <svg className={styles.spark} width="80" height="40" viewBox="0 0 80 40" aria-hidden="true">
        <path
          d="M0,10 C12,12 20,14 28,18 C38,22 46,24 56,30 C64,34 72,34 80,36"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }
  if (kind === "flat") {
    return (
      <svg className={styles.spark} width="80" height="40" viewBox="0 0 80 40" aria-hidden="true">
        <path
          d="M0,26 C10,28 18,22 28,20 C38,18 44,24 54,16 C62,12 70,14 80,12"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }
  return (
    <svg className={styles.spark} width="80" height="40" viewBox="0 0 80 40" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,32 C10,30 18,28 26,26 C34,24 38,28 46,18 C54,10 62,12 80,6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M0,32 C10,30 18,28 26,26 C34,24 38,28 46,18 C54,10 62,12 80,6 L80,40 L0,40 Z"
        fill={`url(#spark-${id})`}
      />
    </svg>
  );
}

function TarjetaKpi({ etiqueta, valor, hint, hintTono, spark, sparkColor, id, enlace }) {
  const claseHint =
    hintTono === "down"
      ? styles.kpiHintCoral
      : hintTono === "up"
        ? styles.kpiHintSage
        : styles.kpiHintMuted;

  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{etiqueta}</div>
      <div className={styles.kpiRow}>
        <div className={styles.kpiMain}>
          <div className={styles.kpiValor}>{valor}</div>
          <div className={claseHint}>{hint}</div>
          {enlace}
        </div>
        <Sparkline kind={spark} color={sparkColor} id={id} />
      </div>
    </div>
  );
}

/* ---------- Gráfico de ventas por día (SVG, sin chart.js) ---------- */

function GraficoVentas({ serie }) {
  const n = serie.length;
  const montos = serie.map((dia) => dia.monto);
  const total = montos.reduce((suma, monto) => suma + monto, 0);
  const bruto = Math.max(...montos, 0);
  const yMax = bruto === 0 ? 25000 : Math.ceil(bruto / 5000) * 5000;

  const x = (indice) => (n === 1 ? 50 : (indice / (n - 1)) * 100);
  const y = (monto) => 100 - (monto / yMax) * 100;
  const puntos = serie.map((dia, indice) => ({
    x: x(indice),
    y: y(dia.monto),
    monto: dia.monto,
    fecha: dia.fecha,
  }));

  const areaD =
    `M ${puntos[0].x} 100 ` +
    puntos.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${puntos[n - 1].x} 100 Z`;

  const ultimo = serie[n - 1];
  const fracciones = [1, 0.8, 0.6, 0.4, 0.2, 0];

  return (
    <section className={`${styles.panel} ${styles.panelChart}`}>
      <div className={styles.panelCabecera}>
        <div>
          <h2 className={styles.panelTitulo}>Ventas por día</h2>
          <p className={styles.panelSub}>
            Últimos {n} días · línea punteada en días sin movimiento
          </p>
        </div>
        <span className={styles.rangoPill}>
          {FECHA_DIA.format(new Date(serie[0].fecha))} → {FECHA_DIA.format(new Date(ultimo.fecha))}
        </span>
      </div>

      <div className={styles.grafico}>
        <div className={styles.gY}>
          {fracciones.map((f) => (
            <span key={f}>{f === 0 ? "0" : `$${(yMax * f) / 1000}k`}</span>
          ))}
        </div>
        <div className={styles.gPlot}>
          <div className={styles.gArea}>
            <svg
              className={styles.gSvg}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Ventas diarias de los últimos ${n} días`}
            >
              <defs>
                <linearGradient id="ventasArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3d7a5d" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#3d7a5d" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {fracciones.map((f) => (
                <line
                  key={f}
                  className={styles.gGrid}
                  x1="0"
                  y1={100 - f * 100}
                  x2="100"
                  y2={100 - f * 100}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {total > 0 && <path d={areaD} fill="url(#ventasArea)" />}

              {puntos.slice(0, -1).map((p, indice) => {
                const q = puntos[indice + 1];
                const sinMovimiento = p.monto === 0 && q.monto === 0;
                return (
                  <line
                    key={p.fecha}
                    className={sinMovimiento ? styles.gLineaVacia : styles.gLinea}
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {total > 0 && (
              <span
                className={styles.gPunto}
                style={{ "--x": `${puntos[n - 1].x}%`, "--y": `${puntos[n - 1].y}%` }}
              />
            )}
          </div>

          <div className={styles.gX}>
            {serie.map((dia, indice) => {
              const fecha = new Date(dia.fecha);
              return (
                <span key={dia.fecha}>
                  {indice === n - 1 ? FECHA_DIA.format(fecha) : fecha.getDate()}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.graficoLeyenda}>
        <span className={styles.leyendaItem}>
          <span className={styles.leyendaLinea} />
          Ventas
        </span>
        <span className={styles.leyendaItem}>
          <span className={styles.leyendaLineaPunteada} />
          Sin datos
        </span>
        <span className={styles.leyendaUltimo}>
          {FECHA_DIA.format(new Date(ultimo.fecha))} · {MONEDA_CLP.format(ultimo.monto)}
        </span>
      </div>
    </section>
  );
}

// Panel en estado de error, reutilizable (gráfico, más vendidos): conserva el
// título para que el hueco siga teniendo contexto.
function PanelError({ titulo, mensaje, onReintentar }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitulo}>{titulo}</h2>
      <div className={styles.estado} role="alert">
        <span>{mensaje}</span>
        <button type="button" onClick={onReintentar}>
          Reintentar
        </button>
      </div>
    </section>
  );
}

// "Más vendidos" con toggle Unidades / Ingresos. El backend entrega los dos
// rankings ya ordenados; el toggle solo elige cuál mostrar (sin volver a pedir).
function PanelMasVendidos({ datos }) {
  const [metrica, setMetrica] = useState("unidades");
  const porUnidades = metrica === "unidades";
  const lista = porUnidades ? datos.porUnidades : datos.porIngresos;
  const valorDe = (item) => (porUnidades ? item.unidades : item.ingresos);
  const maximo = Math.max(1, ...lista.map(valorDe));

  return (
    <section className={styles.panelVerde}>
      <div className={styles.panelCabecera}>
        <h2 className={styles.panelTitulo}>Más vendidos</h2>
        <div className={styles.toggle} role="group" aria-label="Métrica del ranking">
          <button
            type="button"
            className={porUnidades ? styles.toggleActivo : styles.toggleBoton}
            aria-pressed={porUnidades}
            onClick={() => setMetrica("unidades")}
          >
            Unidades
          </button>
          <button
            type="button"
            className={!porUnidades ? styles.toggleActivo : styles.toggleBoton}
            aria-pressed={!porUnidades}
            onClick={() => setMetrica("ingresos")}
          >
            Ingresos
          </button>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className={styles.panelVacio}>Aún no hay ventas en el período.</p>
      ) : (
        <>
          <ul className={styles.vendidosLista}>
            {lista.map((item) => (
              <li className={styles.vendidoFila} key={item.nombre}>
                <div className={styles.vendidoEncabezado}>
                  <span className={styles.vendidoNombre}>{item.nombre}</span>
                  <span className={styles.vendidoValor}>
                    {porUnidades ? `${item.unidades} u.` : MONEDA_CLP.format(item.ingresos)}
                  </span>
                </div>
                <div className={styles.progresoPista}>
                  <div
                    className={styles.progresoBarra}
                    style={{ "--proporcion": `${(valorDe(item) / maximo) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.vendidosNota}>
            {lista.length === 1 ? "Solo 1 producto" : `Solo ${lista.length} productos`} con ventas en
            el período. El resto del catálogo aún no registra unidades.
          </p>
        </>
      )}
    </section>
  );
}

// Orden del flujo de pedidos para el pipeline y colores del donut (paleta Kombai).
const FLUJO_ESTADOS = [
  { clave: "PENDIENTE", etiqueta: "Pendiente" },
  { clave: "PREPARANDO", etiqueta: "Preparando" },
  { clave: "LISTO_PARA_RETIRO", etiqueta: "Listo p/ retiro" },
  { clave: "ENVIADO", etiqueta: "Enviado" },
  { clave: "ENTREGADO", etiqueta: "Entregado" },
  { clave: "CANCELADO", etiqueta: "Cancelado" },
];
const ETIQUETA_ESTADO = Object.fromEntries(FLUJO_ESTADOS.map((e) => [e.clave, e.etiqueta]));
const COLOR_ESTADO = {
  PENDIENTE: "#c4a35a",
  PREPARANDO: "#3d7a5d",
  LISTO_PARA_RETIRO: "#6baf8d",
  ENVIADO: "#8fb8a2",
  ENTREGADO: "#a8c4b4",
  CANCELADO: "#e0d6d2",
};
const CLASE_BADGE = {
  PENDIENTE: styles.badgeGold,
  PREPARANDO: styles.badgeVerde,
  LISTO_PARA_RETIRO: styles.badgeVerde,
  ENVIADO: styles.badgeVerde,
  ENTREGADO: styles.badgeVerde,
  CANCELADO: styles.badgeNeutro,
};

// Acción principal (avance) por estado: refleja la máquina de estados del backend
// (PREPARANDO depende de la modalidad). El servidor sigue siendo la autoridad;
// esto solo decide qué botón ofrecer. CANCELADO no es una acción de tablero.
function accionDe(estado, modalidad) {
  if (estado === "PREPARANDO") {
    return modalidad === "DESPACHO"
      ? { estado: "ENVIADO", etiqueta: "Marcar enviado" }
      : { estado: "LISTO_PARA_RETIRO", etiqueta: "Marcar listo" };
  }
  if (estado === "PENDIENTE") return { estado: "PREPARANDO", etiqueta: "Preparar" };
  if (estado === "LISTO_PARA_RETIRO" || estado === "ENVIADO") {
    return { estado: "ENTREGADO", etiqueta: "Entregar" };
  }
  return null;
}

/* ---------- Donut SVG reutilizable (stroke-dasharray) ---------- */

const DONUT_R = 15.915; // circunferencia = 100 → los segmentos son porcentajes directos

function Donut({ segmentos, centroValor, centroSub }) {
  const total = segmentos.reduce((suma, seg) => suma + seg.valor, 0);
  let acumulado = 0;

  return (
    <div className={styles.donut}>
      <svg className={styles.donutSvg} viewBox="0 0 42 42" aria-hidden="true">
        <circle className={styles.donutTrack} cx="21" cy="21" r={DONUT_R} />
        {total > 0 &&
          segmentos.map((seg, indice) => {
            if (seg.valor <= 0) return null;
            const largo = (seg.valor / total) * 100;
            const desfase = 25 - acumulado; // arranca a las 12 en punto
            acumulado += largo;
            return (
              <circle
                key={indice}
                className={styles.donutSeg}
                cx="21"
                cy="21"
                r={DONUT_R}
                stroke={seg.color}
                strokeDasharray={`${largo} ${100 - largo}`}
                strokeDashoffset={desfase}
              />
            );
          })}
      </svg>
      <div className={styles.donutCentro}>
        <span className={styles.donutCentroValor}>{centroValor}</span>
        <span className={styles.donutCentroSub}>{centroSub}</span>
      </div>
    </div>
  );
}

function DonutPedidos({ pedidosPorEstado }) {
  const filas = FLUJO_ESTADOS.map((estado) => ({
    ...estado,
    valor: pedidosPorEstado[estado.clave] ?? 0,
    color: COLOR_ESTADO[estado.clave],
  }));
  const total = filas.reduce((suma, fila) => suma + fila.valor, 0);

  return (
    <section className={styles.donutCard}>
      <div className={styles.donutCabecera}>
        <h3 className={styles.donutTitulo}>Pedidos por estado</h3>
        <span className={styles.donutNota}>ahora</span>
      </div>
      <div className={styles.donutCuerpo}>
        <Donut
          segmentos={filas.map((fila) => ({ valor: fila.valor, color: fila.color }))}
          centroValor={total}
          centroSub="total"
        />
        <ul className={styles.leyenda}>
          {filas.map((fila) => (
            <li key={fila.clave} className={fila.valor === 0 ? styles.leyendaMuted : undefined}>
              <span className={styles.leyendaLabel}>
                <span className={styles.leyendaPunto} style={{ "--c": fila.color }} />
                {fila.etiqueta}
              </span>
              <span className={styles.leyendaValor}>{fila.valor}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DonutCobros({ cobros }) {
  const totalPagos = cobros.aprobado.cantidad + cobros.pendiente.cantidad;
  const bloques = [
    {
      clave: "aprobado",
      etiqueta: "Cobrado",
      color: "#3d7a5d",
      cantidad: cobros.aprobado.cantidad,
      monto: cobros.aprobado.monto,
    },
    {
      clave: "pendiente",
      etiqueta: "Por cobrar",
      color: "#c4a35a",
      cantidad: cobros.pendiente.cantidad,
      monto: cobros.pendiente.monto,
    },
  ];

  return (
    <section className={styles.donutCard}>
      <div className={styles.donutCabecera}>
        <h3 className={styles.donutTitulo}>Cobros</h3>
      </div>
      <div className={styles.donutCuerpo}>
        <Donut
          segmentos={bloques.map((b) => ({ valor: b.monto, color: b.color }))}
          centroValor={totalPagos}
          centroSub="pagos"
        />
        <ul className={styles.leyendaBloques}>
          {bloques.map((b) => (
            <li key={b.clave}>
              <div className={styles.leyendaBloqueLabel}>
                <span className={styles.leyendaPunto} style={{ "--c": b.color }} />
                {b.etiqueta} · {b.cantidad} {b.cantidad === 1 ? "pago" : "pagos"}
              </div>
              <div className={styles.leyendaBloqueValor}>{MONEDA_CLP.format(b.monto)}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DonutModalidad({ modalidad, periodo }) {
  const total = modalidad.retiro + modalidad.despacho;
  const bloques = [
    { clave: "retiro", etiqueta: "Retiro en tienda", color: "#3d7a5d", monto: modalidad.retiro },
    { clave: "despacho", etiqueta: "Despacho a domicilio", color: "#a8c4b4", monto: modalidad.despacho },
  ];

  return (
    <section className={styles.donutCard}>
      <div className={styles.donutCabecera}>
        <h3 className={styles.donutTitulo}>Ingresos por modalidad</h3>
      </div>
      <div className={styles.donutCuerpo}>
        <Donut
          segmentos={bloques.map((b) => ({ valor: b.monto, color: b.color }))}
          centroValor={montoCorto(total)}
          centroSub={periodoCorto(periodo)}
        />
        <ul className={styles.leyendaBloques}>
          {bloques.map((b) => (
            <li key={b.clave}>
              <div className={styles.leyendaBloqueLabel}>
                <span className={styles.leyendaPunto} style={{ "--c": b.color }} />
                {b.etiqueta}
              </div>
              <div
                className={b.monto === 0 ? styles.leyendaBloqueValorMuted : styles.leyendaBloqueValor}
              >
                {MONEDA_CLP.format(b.monto)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Tabla "Pedidos que requieren acción": cada fila ejecuta su avance inline
// (mismo PATCH de estado que el detalle, con el aviso por correo RF-5.6).
function PanelRequierenAccion({ pedidos, onAccion, cambiandoId, errorAccion }) {
  return (
    <section className={styles.panelPlano}>
      <div className={styles.panelCabeceraPlana}>
        <div>
          <h2 className={styles.panelTitulo}>Pedidos que requieren acción</h2>
          <p className={styles.panelSub}>
            {pedidos.length === 0
              ? "Sin pendientes por atender"
              : `${pedidos.length} ${pedidos.length === 1 ? "pedido espera" : "pedidos esperan"} tu siguiente paso`}
          </p>
        </div>
        <Link className={styles.verTodos} to="/admin/pedidos">
          Ver todos <IconoFlecha />
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <p className={styles.panelVacioPad}>Todo al día — no hay pedidos por atender. 🎉</p>
      ) : (
        <div className={styles.listaAccion}>
          {pedidos.map((pedido) => {
            const accion = accionDe(pedido.estado, pedido.modalidad);
            const cambiando = cambiandoId === pedido.id;
            return (
              <div className={styles.filaAccion} key={pedido.id}>
                <span
                  className={`${styles.avatar} ${
                    pedido.estado === "PENDIENTE" ? styles.avatarGold : styles.avatarSage
                  }`}
                  aria-hidden="true"
                >
                  {iniciales(pedido.contactoNombre)}
                </span>
                <div className={styles.filaAccionInfo}>
                  <div className={styles.filaAccionLinea1}>
                    <span className={styles.filaAccionNumero}>{referencia(pedido.numero)}</span>
                    <span className={styles.filaAccionCliente}>{pedido.contactoNombre}</span>
                  </div>
                  <div className={styles.filaAccionLinea2}>
                    <span className={`${styles.badge} ${CLASE_BADGE[pedido.estado] ?? ""}`}>
                      {ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado}
                    </span>
                    <span className={styles.filaAccionTotal}>{MONEDA_CLP.format(pedido.total)}</span>
                  </div>
                </div>
                {accion ? (
                  <button
                    type="button"
                    className={styles.accionBoton}
                    disabled={cambiando}
                    onClick={() => onAccion(pedido, accion.estado)}
                  >
                    {cambiando ? "…" : accion.etiqueta}
                  </button>
                ) : (
                  <span className={styles.sinAccion}>—</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {errorAccion && (
        <p className={styles.errorAccion} role="alert">
          {errorAccion.mensaje}
        </p>
      )}
    </section>
  );
}

// Panel "Por reponer": productos publicados bajo su umbral, con enlace a editar.
function PanelPorReponer({ productos }) {
  return (
    <section className={styles.panelReponer} id="por-reponer">
      <div className={styles.panelCabecera}>
        <h2 className={styles.panelTitulo}>Por reponer</h2>
        <span className={styles.badgeStock}>stock bajo</span>
      </div>

      {productos.length === 0 ? (
        <p className={styles.panelVacio}>Todo con stock sano. 👍</p>
      ) : (
        <div className={styles.reponerLista}>
          {productos.map((producto) =>
            producto.disponible === 0 ? (
              <div className={styles.reponerAgotadoCard} key={producto.id}>
                <div className={styles.reponerNombre}>{producto.nombre}</div>
                <div className={styles.reponerAgotado}>
                  <IconoAlerta /> Agotado
                </div>
                <Link className={styles.reponerBotonCoral} to={`/admin/productos/${producto.id}/editar`}>
                  <IconoRecargar /> Reponer
                </Link>
              </div>
            ) : (
              <div className={styles.reponerBajoCard} key={producto.id}>
                <div className={styles.reponerNombre}>{producto.nombre}</div>
                <div className={styles.reponerBajo}>{producto.disponible} u. disponibles</div>
                <Link className={styles.reponerBotonOutline} to={`/admin/productos/${producto.id}/editar`}>
                  <IconoRecargar /> Reponer
                </Link>
              </div>
            ),
          )}
        </div>
      )}

      <Link className={styles.reponerVerTodo} to="/admin/productos">
        Ver inventario completo <IconoFlecha />
      </Link>
    </section>
  );
}

export default function AdminResumen() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [periodo, setPeriodo] = useState("mes");
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  // El gráfico de tendencia tiene su propio ciclo de datos (ventana fija, no
  // depende del período): así carga y falla por su cuenta, sin arrastrar a los KPIs.
  const [ventasDiarias, setVentasDiarias] = useState(null);
  const [errorGrafico, setErrorGrafico] = useState(null);
  const [intentoGrafico, setIntentoGrafico] = useState(0);

  // Más vendidos SÍ depende del período (a diferencia del gráfico), pero mantiene
  // su propio estado para cargar/errar sin arrastrar a los KPIs.
  const [masVendidos, setMasVendidos] = useState(null);
  const [errorVendidos, setErrorVendidos] = useState(null);
  const [intentoVendidos, setIntentoVendidos] = useState(0);

  const [cambiandoId, setCambiandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

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

    obtenerResumenAdmin({ periodo })
      .then((data) => {
        if (!vigente) return;
        setResumen(data);
        setError(null);
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
  }, [usuario, periodo, intento]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;

    obtenerVentasDiariasAdmin({ dias: 14 })
      .then((data) => {
        if (!vigente) return;
        setVentasDiarias(data);
        setErrorGrafico(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setErrorGrafico(errorRespuesta.message);
      });

    return () => { vigente = false; };
  }, [usuario, intentoGrafico]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;

    obtenerMasVendidosAdmin({ periodo })
      .then((data) => {
        if (!vigente) return;
        setMasVendidos(data);
        setErrorVendidos(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setErrorVendidos(errorRespuesta.message);
      });

    return () => { vigente = false; };
  }, [usuario, periodo, intentoVendidos]);

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

  // Avance inline desde la tabla. Un cambio de estado afecta a varios paneles
  // (tabla, pipeline, KPIs, cobros), así que refrescamos TODO el resumen con un
  // solo refetch (bump de `intento`).
  async function ejecutarAccion(pedido, siguienteEstado) {
    setCambiandoId(pedido.id);
    setErrorAccion(null);
    try {
      await cambiarEstadoPedidoAdmin(pedido.id, siguienteEstado);
      setIntento((valor) => valor + 1);
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setErrorAccion({
        id: pedido.id,
        mensaje:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos cambiar el estado del pedido.",
      });
    } finally {
      setCambiandoId(null);
    }
  }

  const ventasVar = resumen && textoVariacion(resumen.ventas.variacion, resumen.comparacion);
  const ticketVar =
    resumen && textoVariacion(resumen.ticketPromedio.variacion, resumen.comparacion);

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Resumen">
        <div className={styles.pagina}>
          <div className={styles.contenedor}>
            <header className={styles.cabecera}>
              <div>
                <h1 className={styles.titulo}>{tituloPeriodo(periodo)}</h1>
                <p className={styles.subtitulo}>{subtituloPeriodo(periodo)}</p>
              </div>
              <div className={styles.accionesHeader}>
                <label className={styles.selector}>
                  <span className={styles.srOnly}>Período</span>
                  <select
                    value={periodo}
                    onChange={(evento) => {
                      setCargando(true);
                      setError(null);
                      setPeriodo(evento.target.value);
                    }}
                  >
                    {PERIODOS.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </select>
                  <IconoChevron className={styles.selectorChevron} />
                </label>
                <Link className={styles.botonNuevo} to="/admin/productos/nuevo">
                  <IconoMas /> Nuevo producto
                </Link>
              </div>
            </header>

            {error ? (
              <div className={styles.estado} role="alert">
                <strong>No pudimos cargar el resumen</strong>
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
            ) : cargando && !resumen ? (
              <>
                <div className={styles.atencion} aria-hidden="true">
                  <div className={`${styles.chipSkeleton} ${styles.skeleton}`} />
                  <div className={`${styles.chipSkeleton} ${styles.skeleton}`} />
                </div>
                <section className={styles.kpis} aria-hidden="true">
                  {[0, 1, 2, 3].map((indice) => (
                    <div key={indice} className={`${styles.kpi} ${styles.skeleton}`} />
                  ))}
                </section>
              </>
            ) : resumen ? (
              <>
                <div className={styles.atencion} aria-label="Atención hoy">
                  <span className={styles.atencionLabel}>Atención hoy</span>
                  {resumen.pedidos.pendientesPreparar > 0 && (
                    <Link className={styles.chipSage} to="/admin/pedidos?estado=PENDIENTE">
                      <span className={styles.chipPunto} />
                      {resumen.pedidos.pendientesPreparar} preparar
                    </Link>
                  )}
                  {resumen.stockCritico > 0 && (
                    <button type="button" className={styles.chipCoral} onClick={irAReponer}>
                      <span className={styles.chipPunto} />
                      {resumen.stockCritico} stock
                    </button>
                  )}
                  {resumen.cobros.pendiente.monto > 0 && (
                    <span className={styles.chipGold}>
                      <span className={styles.chipPunto} />
                      Por cobrar {MONEDA_CLP.format(resumen.cobros.pendiente.monto)}
                    </span>
                  )}
                  {resumen.pedidos.pendientesPreparar === 0 &&
                    resumen.stockCritico === 0 &&
                    resumen.cobros.pendiente.monto === 0 && (
                      <span className={styles.chipSageEstatico}>
                        <span className={styles.chipPunto} />
                        Todo al día 🎉
                      </span>
                    )}
                </div>

                <section className={styles.kpis} aria-label="Métricas del período">
                  <TarjetaKpi
                    etiqueta={etiquetaVentas(periodo)}
                    valor={MONEDA_CLP.format(resumen.ventas.actual)}
                    hint={ventasVar.texto}
                    hintTono={ventasVar.tono}
                    spark={ventasVar.tono === "down" ? "down" : ventasVar.tono === "up" ? "up" : "flat"}
                    sparkColor={ventasVar.tono === "down" ? "#e06b5e" : "#3d7a5d"}
                    id="ventas"
                  />

                  <TarjetaKpi
                    etiqueta="Pedidos"
                    valor={resumen.pedidos.total}
                    hint={`${resumen.pedidos.pendientesPreparar} pendientes de preparar`}
                    hintTono="default"
                    spark="up"
                    sparkColor="#3d7a5d"
                    id="pedidos"
                    enlace={
                      <Link className={styles.kpiEnlace} to="/admin/pedidos?estado=PENDIENTE">
                        Ver pendientes <IconoFlecha />
                      </Link>
                    }
                  />

                  <TarjetaKpi
                    etiqueta="Ticket promedio"
                    valor={MONEDA_CLP.format(resumen.ticketPromedio.actual)}
                    hint={ticketVar.texto}
                    hintTono={ticketVar.tono}
                    spark={ticketVar.tono === "down" ? "down" : ticketVar.tono === "up" ? "up" : "flat"}
                    sparkColor={ticketVar.tono === "down" ? "#e06b5e" : "#3d7a5d"}
                    id="ticket"
                  />

                  <TarjetaKpi
                    etiqueta="Stock crítico"
                    valor={resumen.stockCritico}
                    hint={resumen.stockCritico > 0 ? "por reponer pronto" : "todo con stock sano"}
                    hintTono={resumen.stockCritico > 0 ? "down" : "muted"}
                    spark={resumen.stockCritico > 0 ? "down" : "flat"}
                    sparkColor={resumen.stockCritico > 0 ? "#e06b5e" : "#3d7a5d"}
                    id="stock"
                    enlace={
                      resumen.stockCritico > 0 ? (
                        <button type="button" className={styles.kpiEnlaceBtn} onClick={irAReponer}>
                          Ver lista <IconoFlecha />
                        </button>
                      ) : null
                    }
                  />
                </section>

                <div className={styles.filaChartTop}>
                  {errorGrafico ? (
                    <PanelError
                      titulo="Ventas por día"
                      mensaje={errorGrafico}
                      onReintentar={() => {
                        setErrorGrafico(null);
                        setIntentoGrafico((valor) => valor + 1);
                      }}
                    />
                  ) : ventasDiarias ? (
                    <GraficoVentas serie={ventasDiarias.serie} />
                  ) : (
                    <section className={`${styles.panel} ${styles.skeleton}`} aria-hidden="true" />
                  )}

                  {errorVendidos ? (
                    <PanelError
                      titulo="Más vendidos"
                      mensaje={errorVendidos}
                      onReintentar={() => {
                        setErrorVendidos(null);
                        setIntentoVendidos((valor) => valor + 1);
                      }}
                    />
                  ) : masVendidos ? (
                    <PanelMasVendidos datos={masVendidos} />
                  ) : (
                    <section className={`${styles.panelVerde} ${styles.skeleton}`} aria-hidden="true" />
                  )}
                </div>

                <div className={styles.donuts}>
                  <DonutPedidos pedidosPorEstado={resumen.pedidosPorEstado} />
                  <DonutCobros cobros={resumen.cobros} />
                  <DonutModalidad modalidad={resumen.modalidad} periodo={periodo} />
                </div>

                <div className={styles.filaAccionReponer}>
                  <PanelRequierenAccion
                    pedidos={resumen.requierenAccion}
                    onAccion={ejecutarAccion}
                    cambiandoId={cambiandoId}
                    errorAccion={errorAccion}
                  />
                  <PanelPorReponer productos={resumen.porReponer} />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </AdminShell>
    </main>
  );
}
