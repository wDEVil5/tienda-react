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

// Título grande del tablero, derivado del período (estable durante la carga).
function tituloPeriodo(periodo) {
  if (periodo === "hoy") return "Hoy";
  if (periodo === "semana") return "Últimos 7 días";
  const base = new Date();
  if (periodo === "mes-pasado") base.setMonth(base.getMonth() - 1);
  const mes = MES.format(base);
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${base.getFullYear()}`;
}

function etiquetaVentas(periodo) {
  if (periodo === "hoy") return "Ventas de hoy";
  if (periodo === "semana") return "Ventas (7 días)";
  return "Ventas del mes";
}

function referencia(numero) {
  return `#SE-${numero}`;
}

// Drill-down del KPI "Stock crítico": lleva al panel "Por reponer" de la misma
// página (scroll suave dentro del área de contenido del shell).
function irAReponer() {
  document.getElementById("por-reponer")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Delta contra el período anterior. null = sin base para comparar (no fingimos
// un +∞ ni un 100% desde cero): lo decimos con honestidad.
function Variacion({ valor, comparacion }) {
  if (valor === null || valor === undefined) {
    return <span className={styles.variacionNeutra}>Sin datos de {comparacion}</span>;
  }
  const clase =
    valor > 0 ? styles.variacionSube : valor < 0 ? styles.variacionBaja : styles.variacionNeutra;
  return (
    <span className={clase}>
      {valor > 0 ? "+" : ""}
      {valor}% vs {comparacion}
    </span>
  );
}

function TarjetaKpi({ etiqueta, valor, to, onActivar, children }) {
  const contenido = (
    <>
      <span className={styles.kpiEtiqueta}>{etiqueta}</span>
      <span className={styles.kpiValor}>{valor}</span>
      {children}
    </>
  );
  if (to) {
    return (
      <Link className={`${styles.tarjeta} ${styles.tarjetaLink}`} to={to}>
        {contenido}
      </Link>
    );
  }
  if (onActivar) {
    return (
      <button type="button" className={`${styles.tarjeta} ${styles.tarjetaLink}`} onClick={onActivar}>
        {contenido}
      </button>
    );
  }
  return <div className={styles.tarjeta}>{contenido}</div>;
}

// Gráfico de barras "Ventas por día". La altura de cada barra es un dato
// (proporción respecto al máximo), no un estilo: va como variable CSS. La última
// barra (hoy) se resalta. Ventana fija, independiente del selector de período.
function GraficoVentas({ serie }) {
  const maximo = Math.max(1, ...serie.map((dia) => dia.monto));
  const total = serie.reduce((suma, dia) => suma + dia.monto, 0);
  const ultimo = serie[serie.length - 1];

  return (
    <section className={styles.panel}>
      <div className={styles.panelCabecera}>
        <h2 className={styles.panelTitulo}>Ventas por día</h2>
        <span className={styles.panelNota}>últimos {serie.length} días</span>
      </div>

      {total === 0 ? (
        <p className={styles.panelVacio}>Aún no hay ventas registradas en la ventana.</p>
      ) : (
        <>
          <div
            className={styles.grafico}
            role="img"
            aria-label={`Ventas diarias de los últimos ${serie.length} días`}
          >
            {serie.map((dia, indice) => (
              <div
                key={dia.fecha}
                className={`${styles.barra} ${
                  indice === serie.length - 1 ? styles.barraActual : ""
                }`}
                style={{ "--altura": `${(dia.monto / maximo) * 100}%` }}
                title={`${FECHA_DIA.format(new Date(dia.fecha))}: ${MONEDA_CLP.format(dia.monto)}`}
              />
            ))}
          </div>
          <div className={styles.graficoPie}>
            <span>{FECHA_DIA.format(new Date(serie[0].fecha))}</span>
            <span>
              {FECHA_DIA.format(new Date(ultimo.fecha))} · {MONEDA_CLP.format(ultimo.monto)}
            </span>
          </div>
        </>
      )}
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
    <section className={styles.panel}>
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
      )}
    </section>
  );
}

// Orden del flujo de pedidos para el pipeline. Cada estado colorea su barra con
// la misma paleta que los badges de Pedidos (coherencia en toda la app).
const FLUJO_ESTADOS = [
  { clave: "PENDIENTE", etiqueta: "Pendiente" },
  { clave: "PREPARANDO", etiqueta: "Preparando" },
  { clave: "LISTO_PARA_RETIRO", etiqueta: "Listo p/ retiro" },
  { clave: "ENVIADO", etiqueta: "Enviado" },
  { clave: "ENTREGADO", etiqueta: "Entregado" },
  { clave: "CANCELADO", etiqueta: "Cancelado" },
];
const CLASE_BARRA_ESTADO = {
  PENDIENTE: styles.barraPendiente,
  PREPARANDO: styles.barraPreparando,
  LISTO_PARA_RETIRO: styles.barraPreparando,
  ENVIADO: styles.barraEnviado,
  ENTREGADO: styles.barraEntregado,
  CANCELADO: styles.barraCancelado,
};

// Etiquetas de estado (reusa el mismo texto del pipeline) y clases de badge para
// la tabla de acción.
const ETIQUETA_ESTADO = Object.fromEntries(FLUJO_ESTADOS.map((e) => [e.clave, e.etiqueta]));
const CLASE_BADGE = {
  PENDIENTE: styles.badgePendiente,
  PREPARANDO: styles.badgePreparando,
  LISTO_PARA_RETIRO: styles.badgePreparando,
  ENVIADO: styles.badgeEnviado,
  ENTREGADO: styles.badgeEntregado,
  CANCELADO: styles.badgeCancelado,
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

// Tabla "Pedidos que requieren acción": cada fila ejecuta su avance inline
// (mismo PATCH de estado que el detalle, con el aviso por correo RF-5.6).
function PanelRequierenAccion({ pedidos, onAccion, cambiandoId, errorAccion }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelCabecera}>
        <h2 className={styles.panelTitulo}>Pedidos que requieren acción</h2>
        <Link className={styles.verTodos} to="/admin/pedidos">
          Ver todos →
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <p className={styles.panelVacio}>Todo al día — no hay pedidos por atender. 🎉</p>
      ) : (
        <div className={styles.tablaScroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th className={styles.colTotal}>Total</th>
                <th className={styles.colAccion}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => {
                const accion = accionDe(pedido.estado, pedido.modalidad);
                const cambiando = cambiandoId === pedido.id;
                return (
                  <tr key={pedido.id}>
                    <td className={styles.celdaNumero}>{referencia(pedido.numero)}</td>
                    <td className={styles.celdaCliente}>{pedido.contactoNombre}</td>
                    <td>
                      <span className={`${styles.badge} ${CLASE_BADGE[pedido.estado] ?? ""}`}>
                        {ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado}
                      </span>
                    </td>
                    <td className={styles.colTotal}>{MONEDA_CLP.format(pedido.total)}</td>
                    <td className={styles.colAccion}>
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

// Pipeline operativo: cuántos pedidos hay en cada estado ahora mismo.
function PanelPedidosEstado({ pedidosPorEstado }) {
  const filas = FLUJO_ESTADOS.map((estado) => ({
    ...estado,
    valor: pedidosPorEstado[estado.clave] ?? 0,
  }));
  const maximo = Math.max(1, ...filas.map((fila) => fila.valor));
  const total = filas.reduce((suma, fila) => suma + fila.valor, 0);

  return (
    <section className={styles.panel}>
      <div className={styles.panelCabecera}>
        <h2 className={styles.panelTitulo}>Pedidos por estado</h2>
        <span className={styles.panelNota}>ahora</span>
      </div>
      {total === 0 ? (
        <p className={styles.panelVacio}>Aún no hay pedidos.</p>
      ) : (
        <ul className={styles.estadoLista}>
          {filas.map((fila) => (
            <li className={styles.estadoFila} key={fila.clave}>
              <span className={styles.estadoEtiqueta}>{fila.etiqueta}</span>
              <div className={styles.estadoPista}>
                <div
                  className={`${styles.estadoBarra} ${CLASE_BARRA_ESTADO[fila.clave]}`}
                  style={{ "--proporcion": `${(fila.valor / maximo) * 100}%` }}
                />
              </div>
              <span className={styles.estadoValor}>{fila.valor}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Foto financiera: cobrado vs por cobrar (pagos aprobados vs pendientes).
function PanelCobros({ cobros }) {
  const maximo = Math.max(1, cobros.aprobado.monto, cobros.pendiente.monto);
  const filas = [
    { clave: "aprobado", etiqueta: "Cobrado", datos: cobros.aprobado, clase: "" },
    { clave: "pendiente", etiqueta: "Por cobrar", datos: cobros.pendiente, clase: styles.barraPendiente },
  ];

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitulo}>Cobros</h2>
      <ul className={styles.cobrosLista}>
        {filas.map((fila) => (
          <li className={styles.cobroFila} key={fila.clave}>
            <div className={styles.cobroEncabezado}>
              <span>
                {fila.etiqueta}{" "}
                <small className={styles.cobroCantidad}>
                  · {fila.datos.cantidad} {fila.datos.cantidad === 1 ? "pago" : "pagos"}
                </small>
              </span>
              <span className={styles.cobroMonto}>{MONEDA_CLP.format(fila.datos.monto)}</span>
            </div>
            <div className={styles.progresoPista}>
              <div
                className={`${styles.progresoBarra} ${fila.clase}`}
                style={{ "--proporcion": `${(fila.datos.monto / maximo) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Panel "Por reponer": productos publicados bajo su umbral, con enlace a editar
// (donde se ajusta el stock). El drill-down del KPI "Stock crítico" apunta aquí.
function PanelPorReponer({ productos }) {
  return (
    <section className={styles.panel} id="por-reponer">
      <div className={styles.panelCabecera}>
        <h2 className={styles.panelTitulo}>Por reponer</h2>
        <span className={styles.panelNota}>stock bajo</span>
      </div>
      {productos.length === 0 ? (
        <p className={styles.panelVacio}>Todo con stock sano. 👍</p>
      ) : (
        <ul className={styles.reponerLista}>
          {productos.map((producto) => (
            <li className={styles.reponerFila} key={producto.id}>
              <div className={styles.reponerInfo}>
                <span className={styles.reponerNombre}>{producto.nombre}</span>
                <span
                  className={
                    producto.disponible === 0 ? styles.reponerAgotado : styles.reponerBajo
                  }
                >
                  {producto.disponible === 0
                    ? "Agotado"
                    : `${producto.disponible} u. disponibles`}
                </span>
              </div>
              <Link className={styles.reponerBoton} to={`/admin/productos/${producto.id}/editar`}>
                Reponer
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Panel "Ingresos por modalidad": Retiro vs Despacho con barra de proporción.
// La barra recibe su ancho como variable CSS (dato dinámico), no estilo inline.
function PanelModalidad({ modalidad }) {
  const total = modalidad.retiro + modalidad.despacho;
  const filas = [
    { clave: "retiro", etiqueta: "Retiro en tienda", monto: modalidad.retiro },
    { clave: "despacho", etiqueta: "Despacho a domicilio", monto: modalidad.despacho },
  ];

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitulo}>Ingresos por modalidad</h2>
      {total === 0 ? (
        <p className={styles.panelVacio}>Aún no hay ingresos en el período.</p>
      ) : (
        <ul className={styles.modalidadLista}>
          {filas.map((fila) => (
            <li className={styles.modalidadFila} key={fila.clave}>
              <div className={styles.modalidadEncabezado}>
                <span>{fila.etiqueta}</span>
                <span className={styles.modalidadMonto}>{MONEDA_CLP.format(fila.monto)}</span>
              </div>
              <div className={styles.progresoPista}>
                <div
                  className={styles.progresoBarra}
                  style={{ "--proporcion": `${(fila.monto / total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
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
    // El acceso del personal vive en /admin/productos; allí se inicia sesión.
    return <Navigate to="/admin/productos" replace />;
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

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Resumen">
        <div className={styles.pagina}>
          <header className={styles.cabecera}>
            <h1 className={styles.titulo}>{tituloPeriodo(periodo)}</h1>
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
              </label>
              <Link className={styles.botonNuevo} to="/admin/productos/nuevo">
                + Nuevo producto
              </Link>
            </div>
          </header>

          <div className={styles.cuerpo}>
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
              <section className={styles.kpis} aria-hidden="true">
                {[0, 1, 2, 3].map((indice) => (
                  <div key={indice} className={`${styles.tarjeta} ${styles.skeleton}`} />
                ))}
              </section>
            ) : resumen ? (
              <>
                <section className={styles.kpis} aria-label="Métricas del período">
                  <TarjetaKpi
                    etiqueta={etiquetaVentas(periodo)}
                    valor={MONEDA_CLP.format(resumen.ventas.actual)}
                  >
                    <Variacion valor={resumen.ventas.variacion} comparacion={resumen.comparacion} />
                  </TarjetaKpi>

                  <TarjetaKpi
                    etiqueta="Pedidos"
                    valor={resumen.pedidos.total}
                    to="/admin/pedidos?estado=PENDIENTE"
                  >
                    <span className={styles.kpiNota}>
                      {resumen.pedidos.pendientesPreparar} pendientes de preparar
                    </span>
                    <span className={styles.kpiEnlace}>Ver pendientes →</span>
                  </TarjetaKpi>

                  <TarjetaKpi
                    etiqueta="Ticket promedio"
                    valor={MONEDA_CLP.format(resumen.ticketPromedio.actual)}
                  >
                    <Variacion
                      valor={resumen.ticketPromedio.variacion}
                      comparacion={resumen.comparacion}
                    />
                  </TarjetaKpi>

                  <TarjetaKpi
                    etiqueta="Stock crítico"
                    valor={resumen.stockCritico}
                    onActivar={resumen.stockCritico > 0 ? irAReponer : undefined}
                  >
                    <span
                      className={resumen.stockCritico > 0 ? styles.kpiNotaAlerta : styles.kpiNota}
                    >
                      {resumen.stockCritico > 0 ? "por reponer pronto" : "todo con stock sano"}
                    </span>
                    {resumen.stockCritico > 0 && (
                      <span className={styles.kpiEnlace}>Ver lista →</span>
                    )}
                  </TarjetaKpi>
                </section>

                <div className={styles.panelesRow}>
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
                    <section className={`${styles.panel} ${styles.skeleton}`} aria-hidden="true" />
                  )}
                </div>

                <div className={styles.panelesTrio}>
                  <PanelPedidosEstado pedidosPorEstado={resumen.pedidosPorEstado} />
                  <PanelCobros cobros={resumen.cobros} />
                  <PanelModalidad modalidad={resumen.modalidad} />
                </div>

                <div className={styles.panelesRow}>
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
