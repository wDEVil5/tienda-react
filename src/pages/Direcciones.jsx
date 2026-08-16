import { useEffect, useState } from "react";
import CuentaShell from "../components/CuentaShell.jsx";
import {
  actualizarDireccionCuenta,
  crearDireccionCuenta,
  eliminarDireccionCuenta,
  listarDireccionesCuenta,
} from "../services/cuentaApi.js";
import styles from "./Direcciones.module.css";

const DIRECCION_INICIAL = {
  etiqueta: "",
  calle: "",
  depto: "",
  comuna: "",
  region: "Región Metropolitana",
  instrucciones: "",
};

function TarjetaDireccion({ direccion, onEditar, onMarcarPredeterminada }) {
  const titulo = direccion.etiqueta || "Dirección";
  const segundaLinea = [direccion.calle, direccion.depto].filter(Boolean).join(", ");

  return (
    <article className={`${styles.direccion} ${direccion.predeterminada ? styles.direccionPredeterminada : ""}`}>
      <strong>
        {titulo}
        {direccion.predeterminada && " · predeterminada"}
      </strong>
      <p>{segundaLinea}</p>
      <p>{[direccion.comuna, direccion.region].filter(Boolean).join(", ")}</p>
      <div className={styles.accionesDireccion}>
        <button type="button" onClick={() => onEditar(direccion)}>Editar</button>
        {!direccion.predeterminada && (
          <button type="button" onClick={() => onMarcarPredeterminada(direccion)}>
            Predeterminada
          </button>
        )}
      </div>
    </article>
  );
}

export default function Direcciones() {
  const [direcciones, setDirecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [borrador, setBorrador] = useState(DIRECCION_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const ordenar = (lista) =>
    [...lista].sort((a, b) => Number(b.predeterminada) - Number(a.predeterminada));

  useEffect(() => {
    let vigente = true;
    listarDireccionesCuenta()
      .then((lista) => {
        if (vigente) setDirecciones(ordenar(lista ?? []));
      })
      .catch(() => {
        if (vigente) setError("No pudimos cargar tus direcciones.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const abrirNueva = () => {
    setBorrador(DIRECCION_INICIAL);
    setEnEdicion(null);
    setError("");
    setFormularioAbierto(true);
  };

  const editar = (direccion) => {
    setBorrador({
      etiqueta: direccion.etiqueta ?? "",
      calle: direccion.calle ?? "",
      depto: direccion.depto ?? "",
      comuna: direccion.comuna ?? "",
      region: direccion.region ?? "",
      instrucciones: direccion.instrucciones ?? "",
    });
    setEnEdicion(direccion);
    setError("");
    setFormularioAbierto(true);
  };

  const cerrarFormulario = () => {
    if (!guardando) {
      setFormularioAbierto(false);
      setEnEdicion(null);
    }
  };

  const cambiarCampo = (evento) => {
    const { name, value } = evento.target;
    setBorrador((actual) => ({ ...actual, [name]: value }));
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    const datos = Object.fromEntries(
      Object.entries(borrador).filter(([, valor]) => valor.trim() !== ""),
    );
    try {
      if (enEdicion) {
        const actualizada = await actualizarDireccionCuenta(enEdicion.id, datos);
        setDirecciones((actuales) =>
          ordenar(actuales.map((direccion) => (direccion.id === actualizada.id ? actualizada : direccion))),
        );
        setMensaje("Dirección actualizada correctamente.");
      } else {
        const creada = await crearDireccionCuenta(datos);
        setDirecciones((actuales) => ordenar([...actuales, creada]));
        setMensaje("Dirección guardada correctamente.");
      }
      setFormularioAbierto(false);
      setEnEdicion(null);
    } catch (errorRespuesta) {
      setError(errorRespuesta.message || "No pudimos guardar la dirección.");
    } finally {
      setGuardando(false);
    }
  };

  const marcarPredeterminada = async (direccion) => {
    setError("");
    setMensaje("");
    try {
      const actualizada = await actualizarDireccionCuenta(direccion.id, {
        etiqueta: direccion.etiqueta,
        calle: direccion.calle,
        depto: direccion.depto,
        comuna: direccion.comuna,
        region: direccion.region,
        instrucciones: direccion.instrucciones,
        predeterminada: true,
      });
      setDirecciones((actuales) =>
        ordenar(actuales.map((actual) => ({ ...actual, predeterminada: actual.id === actualizada.id }))),
      );
      setMensaje("Actualizamos tu dirección predeterminada.");
    } catch (errorRespuesta) {
      setError(errorRespuesta.message || "No pudimos actualizar la dirección.");
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setGuardando(true);
    setError("");
    try {
      await eliminarDireccionCuenta(aEliminar.id);
      setDirecciones((actuales) => actuales.filter((direccion) => direccion.id !== aEliminar.id));
      setMensaje("Dirección eliminada correctamente.");
      setAEliminar(null);
      setFormularioAbierto(false);
      setEnEdicion(null);
    } catch (errorRespuesta) {
      setError(errorRespuesta.message || "No pudimos eliminar la dirección.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <CuentaShell seccion="Direcciones">
      <div className={styles.contenido}>
        <div className={styles.encabezado}>
          <div>
            <p className={styles.eyebrow}>Mi cuenta</p>
            <h1>Direcciones</h1>
            <p>Guarda las direcciones que usas para despacho. La predeterminada se aplica sola en el checkout.</p>
          </div>
        </div>

        {error && !formularioAbierto && !aEliminar && (
          <p className={styles.errorDireccion} role="alert">{error}</p>
        )}
        {mensaje && <p className={styles.exitoDireccion} role="status">{mensaje}</p>}

        <div className={styles.direcciones}>
          {direcciones.map((direccion) => (
            <TarjetaDireccion
              key={direccion.id}
              direccion={direccion}
              onEditar={editar}
              onMarcarPredeterminada={marcarPredeterminada}
            />
          ))}
          <button className={styles.agregarDireccion} type="button" onClick={abrirNueva}>
            + Agregar dirección
          </button>
        </div>

        {!cargando && direcciones.length === 0 && (
          <p className={styles.sinDirecciones}>Aún no guardas direcciones.</p>
        )}
      </div>

      {formularioAbierto && (
        <div className={styles.modalFondo} role="presentation" onMouseDown={cerrarFormulario}>
          <section
            className={styles.modalDireccion}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-direccion"
            onMouseDown={(evento) => evento.stopPropagation()}
          >
            <div className={styles.modalCabecera}>
              <div>
                <p className={styles.eyebrow}>Direcciones</p>
                <h2 id="titulo-direccion">{enEdicion ? "Editar dirección" : "Agregar dirección"}</h2>
              </div>
              <button type="button" className={styles.cerrarModal} onClick={cerrarFormulario} aria-label="Cerrar formulario">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <form className={styles.formularioDireccion} onSubmit={guardar}>
              <label className={styles.campoDireccion}>
                <span>Nombre de la dirección <small>Opcional</small></span>
                <input name="etiqueta" value={borrador.etiqueta} onChange={cambiarCampo} placeholder="Casa, trabajo…" maxLength="60" />
              </label>
              <label className={styles.campoDireccion}>
                <span>Dirección</span>
                <input name="calle" value={borrador.calle} onChange={cambiarCampo} placeholder="Av. Providencia 1234" minLength="3" maxLength="200" required autoFocus />
              </label>
              <label className={styles.campoDireccion}>
                <span>Departamento, casa u oficina <small>Opcional</small></span>
                <input name="depto" value={borrador.depto} onChange={cambiarCampo} placeholder="Depto 502" maxLength="60" />
              </label>
              <div className={styles.filaCamposDireccion}>
                <label className={styles.campoDireccion}>
                  <span>Comuna</span>
                  <input name="comuna" value={borrador.comuna} onChange={cambiarCampo} placeholder="Providencia" minLength="2" maxLength="80" required />
                </label>
                <label className={styles.campoDireccion}>
                  <span>Región</span>
                  <input name="region" value={borrador.region} onChange={cambiarCampo} minLength="2" maxLength="80" required />
                </label>
              </div>
              <label className={styles.campoDireccion}>
                <span>Instrucciones para la entrega <small>Opcional</small></span>
                <textarea name="instrucciones" value={borrador.instrucciones} onChange={cambiarCampo} placeholder="Dejar en conserjería" maxLength="300" rows="3" />
              </label>

              {error && <p className={styles.errorDireccion} role="alert">{error}</p>}

              <div className={styles.accionesModal}>
                {enEdicion && (
                  <button type="button" className={styles.eliminarDireccion} onClick={() => setAEliminar(enEdicion)} disabled={guardando}>
                    Eliminar
                  </button>
                )}
                <button type="button" className={styles.cancelarDireccion} onClick={cerrarFormulario} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className={styles.guardarDireccion} disabled={guardando}>
                  {guardando ? "Guardando…" : enEdicion ? "Guardar cambios" : "Guardar dirección"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {aEliminar && (
        <div className={styles.modalFondo} role="presentation" onMouseDown={() => !guardando && setAEliminar(null)}>
          <section className={styles.confirmarEliminar} role="dialog" aria-modal="true" aria-labelledby="titulo-eliminar-direccion" onMouseDown={(evento) => evento.stopPropagation()}>
            <h2 id="titulo-eliminar-direccion">¿Eliminar dirección?</h2>
            <p>Se eliminará “{aEliminar.etiqueta || aEliminar.calle}”. Esta acción no se puede deshacer.</p>
            {error && <p className={styles.errorDireccion} role="alert">{error}</p>}
            <div className={styles.accionesModal}>
              <button type="button" className={styles.cancelarDireccion} onClick={() => setAEliminar(null)} disabled={guardando}>Cancelar</button>
              <button type="button" className={styles.confirmarEliminarBoton} onClick={confirmarEliminar} disabled={guardando}>
                {guardando ? "Eliminando…" : "Eliminar dirección"}
              </button>
            </div>
          </section>
        </div>
      )}
    </CuentaShell>
  );
}
