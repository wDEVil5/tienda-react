import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCuenta } from "../context/CuentaContext.jsx";
import {
  crearDireccionCuenta,
  listarDireccionesCuenta,
  listarPedidosCuenta,
} from "../services/cuentaApi.js";
import styles from "./MiCuenta.module.css";

const ESTADOS_EN_CURSO = new Set([
  "PENDIENTE",
  "PREPARANDO",
  "LISTO_PARA_RETIRO",
  "ENVIADO",
]);

const etiquetasEstado = {
  PENDIENTE: "pendiente",
  PREPARANDO: "en preparación",
  LISTO_PARA_RETIRO: "listo para retiro",
  ENVIADO: "enviada",
};

const DIRECCION_INICIAL = {
  etiqueta: "",
  calle: "",
  depto: "",
  comuna: "",
  region: "Región Metropolitana",
  instrucciones: "",
};

function formatearCLP(monto) {
  return `\u0024${Number(monto ?? 0).toLocaleString("es-CL")}`;
}

function esDelMesActual(fecha) {
  const fechaPedido = new Date(fecha);
  const hoy = new Date();
  return (
    !Number.isNaN(fechaPedido.valueOf()) &&
    fechaPedido.getFullYear() === hoy.getFullYear() &&
    fechaPedido.getMonth() === hoy.getMonth()
  );
}

function TarjetaDireccion({ direccion }) {
  const titulo = direccion.etiqueta || "Dirección";
  const segundaLinea = [direccion.calle, direccion.depto].filter(Boolean).join(", ");

  return (
    <article
      className={`${styles.direccion} ${direccion.predeterminada ? styles.direccionPredeterminada : ""}`}
    >
      <strong>
        {titulo}
        {direccion.predeterminada && " · predeterminada"}
      </strong>
      <p>{segundaLinea}</p>
      <p>{[direccion.comuna, direccion.region].filter(Boolean).join(", ")}</p>
    </article>
  );
}

// Resumen inicial de la cuenta. Muestra solo datos entregados por los endpoints
// actuales; editar perfil, seguridad e historial detallado llegan en sus pasos.
function MiCuenta() {
  const navegar = useNavigate();
  const { cliente, cerrarSesion } = useCuenta();
  const [direcciones, setDirecciones] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState("");
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [formularioDireccionAbierto, setFormularioDireccionAbierto] = useState(false);
  const [direccionNueva, setDireccionNueva] = useState(DIRECCION_INICIAL);
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState("");
  const [mensajeDireccion, setMensajeDireccion] = useState("");

  useEffect(() => {
    let vigente = true;

    Promise.all([listarDireccionesCuenta(), listarPedidosCuenta()])
      .then(([direccionesCuenta, pedidosCuenta]) => {
        if (!vigente) return;
        setDirecciones(direccionesCuenta ?? []);
        setPedidos(pedidosCuenta ?? []);
      })
      .catch(() => {
        if (vigente) setError("No pudimos cargar los datos de tu cuenta.");
      })
      .finally(() => {
        if (vigente) setCargandoDatos(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const resumen = useMemo(() => {
    const pedidosEnCurso = pedidos.filter((pedido) => ESTADOS_EN_CURSO.has(pedido.estado));
    const pedidosDelMes = pedidos.filter((pedido) => esDelMesActual(pedido.createdAt));
    const totalMes = pedidosDelMes.reduce((total, pedido) => total + pedido.total, 0);

    return { pedidosEnCurso, pedidosDelMes, totalMes };
  }, [pedidos]);

  const inicial = cliente?.nombre?.trim().charAt(0).toUpperCase() || "C";
  const primerPedidoEnCurso = resumen.pedidosEnCurso[0];

  const manejarCerrarSesion = async () => {
    setCerrandoSesion(true);
    setError("");
    try {
      await cerrarSesion();
      navegar("/", { replace: true });
    } catch {
      setError("No pudimos cerrar tu sesión. Inténtalo nuevamente.");
      setCerrandoSesion(false);
    }
  };

  const abrirFormularioDireccion = () => {
    setDireccionNueva(DIRECCION_INICIAL);
    setErrorDireccion("");
    setFormularioDireccionAbierto(true);
  };

  const cerrarFormularioDireccion = () => {
    if (!guardandoDireccion) setFormularioDireccionAbierto(false);
  };

  const actualizarCampoDireccion = (evento) => {
    const { name, value } = evento.target;
    setDireccionNueva((actual) => ({ ...actual, [name]: value }));
  };

  const guardarDireccion = async (evento) => {
    evento.preventDefault();
    setGuardandoDireccion(true);
    setErrorDireccion("");

    // Los opcionales vacíos no viajan como texto: el contrato los entiende como
    // ausentes y la tarjeta no terminará mostrando una línea sin contenido.
    const datos = Object.fromEntries(
      Object.entries(direccionNueva).filter(([, valor]) => valor.trim() !== ""),
    );

    try {
      const creada = await crearDireccionCuenta(datos);
      setDirecciones((actuales) => [...actuales, creada]);
      setMensajeDireccion("Dirección guardada correctamente.");
      setFormularioDireccionAbierto(false);
    } catch (error) {
      setErrorDireccion(error.message || "No pudimos guardar la dirección.");
    } finally {
      setGuardandoDireccion(false);
    }
  };

  return (
    <section className={styles.pantalla} aria-labelledby="titulo-cuenta">
      <header className={styles.cabecera}>
        <Link to="/" className={styles.logo}>
          Sumarket<em>Express</em>
        </Link>
        <div className={styles.sesionActual}>
          <span>{cliente?.nombre}</span>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={manejarCerrarSesion} disabled={cerrandoSesion}>
            {cerrandoSesion ? "Saliendo…" : "Salir"}
          </button>
        </div>
      </header>

      <div className={styles.cuerpo}>
        <aside className={styles.navegacion} aria-label="Secciones de mi cuenta">
          <button className={styles.navActiva} type="button" aria-current="page">
            Resumen
          </button>
          <span className={styles.navPendiente} title="Se habilitará con el historial de pedidos">
            Mis pedidos
          </span>
          <a href="#direcciones">Direcciones</a>
          <span className={styles.navPendiente} title="Se habilitará con la edición de perfil">
            Datos y seguridad
          </span>
        </aside>

        <div className={styles.contenido}>
          <div className={styles.perfil}>
            <div className={styles.avatar} aria-hidden="true">{inicial}</div>
            <div>
              <h1 id="titulo-cuenta">{cliente?.nombre}</h1>
              <p>Cuenta activa · {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}</p>
            </div>
            <span className={styles.accionPendiente} title="La edición de perfil se habilitará en un próximo paso">
              Editar datos
            </span>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.metricas} aria-busy={cargandoDatos}>
            <article className={styles.metrica}>
              <p className={styles.eyebrow}>En curso</p>
              <strong>{resumen.pedidosEnCurso.length}</strong>
              <span>
                {primerPedidoEnCurso
                  ? `#SE-${primerPedidoEnCurso.numero} ${etiquetasEstado[primerPedidoEnCurso.estado] ?? "en curso"}`
                  : "Sin pedidos en curso"}
              </span>
            </article>
            <article className={styles.metrica}>
              <p className={styles.eyebrow}>Gastado este mes</p>
              <strong>{formatearCLP(resumen.totalMes)}</strong>
              <span>{resumen.pedidosDelMes.length} {resumen.pedidosDelMes.length === 1 ? "pedido" : "pedidos"}</span>
            </article>
            <article className={styles.metrica}>
              <p className={styles.eyebrow}>Ahorro en ofertas</p>
              <strong className={styles.metricaPendiente}>—</strong>
              <span>Disponible en tu historial</span>
            </article>
          </div>

          <section id="direcciones" className={styles.seccion} aria-labelledby="titulo-direcciones">
            <h2 id="titulo-direcciones">Direcciones guardadas</h2>
            <div className={styles.direcciones}>
              {direcciones.slice(0, 2).map((direccion) => (
                <TarjetaDireccion key={direccion.id} direccion={direccion} />
              ))}
              <button className={styles.agregarDireccion} type="button" onClick={abrirFormularioDireccion}>
                + Agregar
              </button>
            </div>
            {!cargandoDatos && direcciones.length === 0 && (
              <p className={styles.sinDirecciones}>Aún no guardas direcciones.</p>
            )}
            {mensajeDireccion && <p className={styles.exitoDireccion} role="status">{mensajeDireccion}</p>}
          </section>

          <section className={`${styles.seccion} ${styles.seguridad}`} aria-labelledby="titulo-seguridad">
            <h2 id="titulo-seguridad">Datos y seguridad</h2>
            <div className={styles.filaSeguridad}>
              <span>Cambiar contraseña</span>
              <span className={styles.accionPendiente} title="Esta acción requiere un endpoint de cambio de contraseña">Cambiar</span>
            </div>
            <div className={styles.filaSeguridad}>
              <span>Avisos de ofertas por correo</span>
              <span className={styles.interruptorPendiente} title="Esta preferencia aún no tiene endpoint" aria-label="Avisos de ofertas pendientes">
                <i />
              </span>
            </div>
            <div className={styles.filaSeguridad}>
              <span>Cerrar sesión en todos los dispositivos</span>
              <span className={styles.accionPeligrosa} title="Esta acción requiere revocar todas las sesiones">Cerrar</span>
            </div>
          </section>
        </div>
      </div>

      {formularioDireccionAbierto && (
        <div className={styles.modalFondo} role="presentation" onMouseDown={cerrarFormularioDireccion}>
          <section
            className={styles.modalDireccion}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-nueva-direccion"
            onMouseDown={(evento) => evento.stopPropagation()}
          >
            <div className={styles.modalCabecera}>
              <div>
                <p className={styles.eyebrow}>Direcciones</p>
                <h2 id="titulo-nueva-direccion">Agregar dirección</h2>
              </div>
              <button type="button" className={styles.cerrarModal} onClick={cerrarFormularioDireccion} aria-label="Cerrar formulario">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <form className={styles.formularioDireccion} onSubmit={guardarDireccion}>
              <label className={styles.campoDireccion}>
                <span>Nombre de la dirección <small>Opcional</small></span>
                <input name="etiqueta" value={direccionNueva.etiqueta} onChange={actualizarCampoDireccion} placeholder="Casa, trabajo…" maxLength="60" />
              </label>
              <label className={styles.campoDireccion}>
                <span>Dirección</span>
                <input name="calle" value={direccionNueva.calle} onChange={actualizarCampoDireccion} placeholder="Av. Providencia 1234" minLength="3" maxLength="200" required autoFocus />
              </label>
              <label className={styles.campoDireccion}>
                <span>Departamento, casa u oficina <small>Opcional</small></span>
                <input name="depto" value={direccionNueva.depto} onChange={actualizarCampoDireccion} placeholder="Depto 502" maxLength="60" />
              </label>
              <div className={styles.filaCamposDireccion}>
                <label className={styles.campoDireccion}>
                  <span>Comuna</span>
                  <input name="comuna" value={direccionNueva.comuna} onChange={actualizarCampoDireccion} placeholder="Providencia" minLength="2" maxLength="80" required />
                </label>
                <label className={styles.campoDireccion}>
                  <span>Región</span>
                  <input name="region" value={direccionNueva.region} onChange={actualizarCampoDireccion} minLength="2" maxLength="80" required />
                </label>
              </div>
              <label className={styles.campoDireccion}>
                <span>Instrucciones para la entrega <small>Opcional</small></span>
                <textarea name="instrucciones" value={direccionNueva.instrucciones} onChange={actualizarCampoDireccion} placeholder="Dejar en conserjería" maxLength="300" rows="3" />
              </label>

              {errorDireccion && <p className={styles.errorDireccion} role="alert">{errorDireccion}</p>}

              <div className={styles.accionesModal}>
                <button type="button" className={styles.cancelarDireccion} onClick={cerrarFormularioDireccion} disabled={guardandoDireccion}>
                  Cancelar
                </button>
                <button type="submit" className={styles.guardarDireccion} disabled={guardandoDireccion}>
                  {guardandoDireccion ? "Guardando…" : "Guardar dirección"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default MiCuenta;
