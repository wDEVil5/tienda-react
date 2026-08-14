import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  listarClientesAdmin,
  obtenerClienteAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminClientes.module.css";

const LIMITE = 20;

const MONEDA_CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const FECHA = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const FECHA_CORTA = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
});

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

function iniciales(nombre) {
  return (nombre ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function referencia(numero) {
  return `#SE-${numero}`;
}

function lineaDireccion(direccion) {
  return [direccion.calle, direccion.depto, direccion.comuna, direccion.region]
    .filter(Boolean)
    .join(", ");
}

// Iconos inline (trazo, 24×24) — sin dependencias ni estilos inline.
function Ico({ d, size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}
const ICO_MAIL = (
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </>
);
const ICO_TEL = (
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
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
const ICO_RELOJ = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>
);
const ICO_PIN = (
  <>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </>
);
const ICO_ESTRELLA = (
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
);

// Ficha del cliente (columna derecha). Datos de contacto, métricas de compra,
// direcciones guardadas e historial de pedidos recientes.
function FichaCliente({ ficha }) {
  const { metricas } = ficha;
  const frecuente = metricas.pedidos >= 3;

  return (
    <div className={styles.fichaContenido}>
      <header className={styles.fichaCabecera}>
        <span className={styles.fichaAvatar} aria-hidden="true">
          {iniciales(ficha.nombre)}
        </span>
        <div className={styles.fichaIdentidad}>
          <div className={styles.fichaNombreFila}>
            <h2 className={styles.fichaNombre}>{ficha.nombre}</h2>
            {frecuente && (
              <span className={styles.badgeFrecuente}>
                <Ico d={ICO_ESTRELLA} size={12} /> Frecuente
              </span>
            )}
            {!ficha.activo && <span className={styles.badgeInactivo}>Inactivo</span>}
          </div>
          <p className={styles.fichaAlta}>
            Cliente desde {FECHA.format(new Date(ficha.createdAt))}
            {ficha.conGoogle && " · cuenta con Google"}
          </p>
        </div>
      </header>

      <div className={styles.contacto}>
        <a className={styles.contactoLinea} href={`mailto:${ficha.email}`}>
          <Ico d={ICO_MAIL} size={15} /> {ficha.email}
        </a>
        {ficha.telefono && (
          <a className={styles.contactoLinea} href={`tel:${ficha.telefono}`}>
            <Ico d={ICO_TEL} size={15} /> {ficha.telefono}
          </a>
        )}
      </div>

      <div className={styles.metricas}>
        <div className={styles.metrica}>
          <span className={styles.metricaIcono}><Ico d={ICO_BOLSA} size={18} /></span>
          <span className={styles.metricaValor}>{metricas.pedidos}</span>
          <span className={styles.metricaLabel}>Pedidos pagados</span>
        </div>
        <div className={styles.metrica}>
          <span className={styles.metricaIcono}><Ico d={ICO_BILLETERA} size={18} /></span>
          <span className={styles.metricaValor}>{MONEDA_CLP.format(metricas.totalGastado)}</span>
          <span className={styles.metricaLabel}>Total gastado</span>
        </div>
        <div className={styles.metrica}>
          <span className={styles.metricaIcono}><Ico d={ICO_RELOJ} size={18} /></span>
          <span className={styles.metricaValor}>
            {metricas.ultimaCompra ? FECHA_CORTA.format(new Date(metricas.ultimaCompra)) : "—"}
          </span>
          <span className={styles.metricaLabel}>Última compra</span>
        </div>
      </div>

      <section className={styles.bloque}>
        <h3 className={styles.bloqueTitulo}>
          Direcciones {ficha.direcciones.length > 0 && `(${ficha.direcciones.length})`}
        </h3>
        {ficha.direcciones.length === 0 ? (
          <p className={styles.vacioBloque}>Sin direcciones guardadas.</p>
        ) : (
          <ul className={styles.direcciones}>
            {ficha.direcciones.map((direccion) => (
              <li key={direccion.id} className={styles.direccion}>
                <span className={styles.direccionIcono}><Ico d={ICO_PIN} size={15} /></span>
                <span className={styles.direccionTexto}>
                  <span className={styles.direccionLinea}>
                    {direccion.etiqueta && (
                      <strong className={styles.direccionEtiqueta}>{direccion.etiqueta}</strong>
                    )}
                    {direccion.predeterminada && (
                      <span className={styles.chipDefecto}>Predeterminada</span>
                    )}
                  </span>
                  <span className={styles.direccionDetalle}>{lineaDireccion(direccion)}</span>
                  {direccion.instrucciones && (
                    <span className={styles.direccionNota}>{direccion.instrucciones}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.bloque}>
        <h3 className={styles.bloqueTitulo}>Pedidos recientes</h3>
        {ficha.pedidos.length === 0 ? (
          <p className={styles.vacioBloque}>Este cliente aún no ha realizado pedidos.</p>
        ) : (
          <ul className={styles.pedidos}>
            {ficha.pedidos.map((pedido) => (
              <li key={pedido.id} className={styles.pedido}>
                <span className={styles.pedidoNumero}>{referencia(pedido.numero)}</span>
                <span className={styles.pedidoMeta}>
                  {FECHA_CORTA.format(new Date(pedido.createdAt))} · {pedido.items}{" "}
                  {pedido.items === 1 ? "ítem" : "ítems"}
                </span>
                <span className={`${styles.badge} ${CLASE_ESTADO[pedido.estado] ?? ""}`}>
                  {ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado}
                </span>
                <span className={styles.pedidoTotal}>{MONEDA_CLP.format(pedido.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminClientes() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [clientes, setClientes] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  const [ficha, setFicha] = useState(null);
  const [errorFicha, setErrorFicha] = useState(null);
  const [intentoFicha, setIntentoFicha] = useState(0);

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

  // Debounce de la búsqueda: aplica lo escrito 350 ms tras la última tecla y
  // vuelve a la página 1 (los resultados filtrados empiezan desde el principio).
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

    listarClientesAdmin({
      page,
      limit: LIMITE,
      q: busquedaAplicada || undefined,
    })
      .then((resultado) => {
        if (!vigente) return;
        const data = Array.isArray(resultado.data) ? resultado.data : [];
        setClientes(data);
        setMeta(resultado.meta);
        setSeleccionado((actual) =>
          actual && data.some((cliente) => cliente.id === actual) ? actual : data[0]?.id ?? null,
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

    return () => {
      vigente = false;
    };
  }, [usuario, page, busquedaAplicada, intento]);

  useEffect(() => {
    if (!usuario || !seleccionado) return undefined;
    let vigente = true;

    obtenerClienteAdmin(seleccionado)
      .then((data) => {
        if (!vigente) return;
        setFicha(data);
        setErrorFicha(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setErrorFicha({ id: seleccionado, mensaje: errorRespuesta.message });
      });

    return () => {
      vigente = false;
    };
  }, [usuario, seleccionado, intentoFicha]);

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

  const fichaLista = ficha && ficha.id === seleccionado;
  const errorFichaActual =
    errorFicha && errorFicha.id === seleccionado ? errorFicha.mensaje : null;
  const totalPaginas = meta?.totalPages ?? 1;

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Clientes">
        <header className={styles.cabecera}>
          <div>
            <h1>Clientes</h1>
            {meta && (
              <p className={styles.subtitulo}>
                {meta.total} {meta.total === 1 ? "cliente registrado" : "clientes registrados"}
              </p>
            )}
          </div>
          <label className={styles.buscar}>
            <span className={styles.srOnly}>Buscar por nombre o email</span>
            <input
              type="search"
              placeholder="Buscar por nombre o email"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </label>
        </header>

        <div className={styles.cuerpo}>
          <div className={styles.columnaLista}>
            <div className={styles.lista} aria-label="Lista de clientes">
              {cargando ? (
                <p className={styles.estadoLista} role="status">
                  Cargando clientes…
                </p>
              ) : error ? (
                <div className={styles.estadoLista} role="alert">
                  <strong>No pudimos cargar los clientes</strong>
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
              ) : clientes.length === 0 ? (
                <div className={styles.estadoLista}>
                  <strong>No hay clientes para mostrar</strong>
                  <span>
                    {busquedaAplicada
                      ? `Sin resultados para «${busquedaAplicada}».`
                      : "Aún no hay clientes registrados."}
                  </span>
                </div>
              ) : (
                clientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    className={`${styles.fila} ${cliente.id === seleccionado ? styles.filaActiva : ""}`}
                    type="button"
                    aria-current={cliente.id === seleccionado ? "true" : undefined}
                    onClick={() => setSeleccionado(cliente.id)}
                  >
                    <span className={styles.filaAvatar} aria-hidden="true">
                      {iniciales(cliente.nombre)}
                    </span>
                    <span className={styles.filaPrincipal}>
                      <span className={styles.filaNombre}>{cliente.nombre}</span>
                      <span className={styles.filaEmail}>{cliente.email}</span>
                    </span>
                    <span className={styles.filaCompras}>
                      <span className={styles.filaGasto}>
                        {MONEDA_CLP.format(cliente.totalGastado)}
                      </span>
                      <span className={styles.filaPedidos}>
                        {cliente.pedidos} {cliente.pedidos === 1 ? "pedido" : "pedidos"}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {!cargando && !error && clientes.length > 0 && (
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

          <aside className={styles.ficha} aria-label="Ficha del cliente">
            {!seleccionado ? (
              <p className={styles.fichaVacio}>Selecciona un cliente para ver su ficha.</p>
            ) : errorFichaActual ? (
              <div className={styles.fichaEstado} role="alert">
                <strong>No pudimos cargar la ficha</strong>
                <span>{errorFichaActual}</span>
                <button type="button" onClick={() => setIntentoFicha((valor) => valor + 1)}>
                  Reintentar
                </button>
              </div>
            ) : fichaLista ? (
              <FichaCliente ficha={ficha} />
            ) : (
              <p className={styles.fichaEstado} role="status">
                Cargando ficha…
              </p>
            )}
          </aside>
        </div>
      </AdminShell>
    </main>
  );
}
