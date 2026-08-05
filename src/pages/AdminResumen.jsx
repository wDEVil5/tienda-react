import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  obtenerResumenAdmin,
  obtenerSesionAdmin,
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

function TarjetaKpi({ etiqueta, valor, to, children }) {
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
  return <div className={styles.tarjeta}>{contenido}</div>;
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
              <div className={styles.modalidadPista}>
                <div
                  className={styles.modalidadBarra}
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

                  <TarjetaKpi etiqueta="Stock crítico" valor={resumen.stockCritico}>
                    <span
                      className={resumen.stockCritico > 0 ? styles.kpiNotaAlerta : styles.kpiNota}
                    >
                      {resumen.stockCritico > 0 ? "por reponer pronto" : "todo con stock sano"}
                    </span>
                  </TarjetaKpi>
                </section>

                <PanelModalidad modalidad={resumen.modalidad} />
              </>
            ) : null}
          </div>
        </div>
      </AdminShell>
    </main>
  );
}
