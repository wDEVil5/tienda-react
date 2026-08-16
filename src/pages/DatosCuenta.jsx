import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CuentaShell from "../components/CuentaShell.jsx";
import { useCuenta } from "../context/CuentaContext.jsx";
import styles from "./DatosCuenta.module.css";

const crearPerfilEditable = (cliente) => ({
  nombre: cliente?.nombre ?? "",
  telefono: cliente?.telefono ?? "",
});

const CONTRASENA_INICIAL = {
  contrasenaActual: "",
  contrasenaNueva: "",
  confirmacion: "",
};

// Esta vista solo permite editar los campos respaldados por PATCH /cuenta/perfil.
// Email y seguridad se mantienen fuera para no mezclar credenciales con perfil.
function DatosCuenta() {
  const {
    cliente,
    actualizarPerfil,
    cambiarContrasena,
    cerrarTodasLasSesiones,
  } = useCuenta();
  const navegar = useNavigate();
  const [perfil, setPerfil] = useState(() => crearPerfilEditable(cliente));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modalContrasenaAbierto, setModalContrasenaAbierto] = useState(false);
  const [contrasenas, setContrasenas] = useState(CONTRASENA_INICIAL);
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState("");
  const [modalSesionesAbierto, setModalSesionesAbierto] = useState(false);
  const [cerrandoSesiones, setCerrandoSesiones] = useState(false);
  const [errorSesiones, setErrorSesiones] = useState("");

  const tieneCambios =
    perfil.nombre.trim() !== (cliente?.nombre ?? "") ||
    perfil.telefono.trim() !== (cliente?.telefono ?? "");

  const cambiarCampo = (evento) => {
    const { name, value } = evento.target;
    setPerfil((actual) => ({ ...actual, [name]: value }));
    setError("");
    setMensaje("");
  };

  const guardarPerfil = async (evento) => {
    evento.preventDefault();
    const nombre = perfil.nombre.trim();
    const telefono = perfil.telefono.trim();

    if (nombre.length < 2) {
      setError("Escribe tu nombre completo.");
      return;
    }
    if (telefono && telefono.length < 6) {
      setError("Ingresa un teléfono válido o déjalo vacío.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      await actualizarPerfil({ nombre, telefono: telefono || null });
      setMensaje("Tus datos se actualizaron correctamente.");
    } catch (errorSolicitud) {
      setError(errorSolicitud.message || "No pudimos guardar tus datos.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirCambioContrasena = () => {
    setContrasenas(CONTRASENA_INICIAL);
    setErrorContrasena("");
    setModalContrasenaAbierto(true);
  };

  const cerrarCambioContrasena = () => {
    if (!guardandoContrasena) setModalContrasenaAbierto(false);
  };

  const cambiarCampoContrasena = (evento) => {
    const { name, value } = evento.target;
    setContrasenas((actual) => ({ ...actual, [name]: value }));
    setErrorContrasena("");
  };

  const guardarContrasena = async (evento) => {
    evento.preventDefault();
    const { contrasenaActual, contrasenaNueva, confirmacion } = contrasenas;

    if (contrasenaNueva.length < 12) {
      setErrorContrasena("La nueva contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (contrasenaNueva === contrasenaActual) {
      setErrorContrasena("La nueva contraseña debe ser distinta de la actual.");
      return;
    }
    if (contrasenaNueva !== confirmacion) {
      setErrorContrasena("Las contraseñas nuevas no coinciden.");
      return;
    }

    setGuardandoContrasena(true);
    setErrorContrasena("");
    try {
      await cambiarContrasena({ contrasenaActual, contrasenaNueva });
      setModalContrasenaAbierto(false);
      setMensaje("Contraseña actualizada. Cerramos las sesiones de otros dispositivos.");
    } catch (errorSolicitud) {
      setErrorContrasena(errorSolicitud.message || "No pudimos cambiar tu contraseña.");
    } finally {
      setGuardandoContrasena(false);
    }
  };

  const abrirCierreSesiones = () => {
    setErrorSesiones("");
    setModalSesionesAbierto(true);
  };

  const cerrarCierreSesiones = () => {
    if (!cerrandoSesiones) setModalSesionesAbierto(false);
  };

  const confirmarCierreSesiones = async () => {
    setCerrandoSesiones(true);
    setErrorSesiones("");
    try {
      await cerrarTodasLasSesiones();
      navegar("/login", { replace: true });
    } catch (errorSolicitud) {
      setErrorSesiones(errorSolicitud.message || "No pudimos cerrar las sesiones. Inténtalo nuevamente.");
    } finally {
      setCerrandoSesiones(false);
    }
  };

  return (
    <CuentaShell seccion="Datos y seguridad">
        <main className={styles.contenido}>
          <header className={styles.encabezadoPagina}>
            <p className={styles.eyebrow}>Mi cuenta</p>
            <h1 id="titulo-datos-cuenta">Tus datos</h1>
            <p>Revisa la información que usamos para identificar tu cuenta y tus compras.</p>
          </header>

          <section className={styles.tarjeta} aria-labelledby="titulo-personales">
            <div className={styles.cabeceraTarjeta}>
              <div>
                <h2 id="titulo-personales">Datos personales</h2>
                <p>Estos datos provienen de tu cuenta activa.</p>
              </div>
              <span className={styles.estadoDisponible}>Edición disponible</span>
            </div>

            <form className={styles.formulario} onSubmit={guardarPerfil} noValidate>
              <div className={styles.campo}>
                <label htmlFor="nombre-cuenta">Nombre completo</label>
                <input
                  id="nombre-cuenta"
                  name="nombre"
                  value={perfil.nombre}
                  onChange={cambiarCampo}
                  autoComplete="name"
                  required
                />
              </div>
              <div className={styles.campo}>
                <label htmlFor="email-cuenta">Email</label>
                <input id="email-cuenta" type="email" value={cliente?.email ?? ""} readOnly aria-describedby="nota-email" />
                <small id="nota-email">Lo usas para entrar. Cambiarlo requerirá verificar el nuevo correo.</small>
              </div>
              <div className={styles.campo}>
                <label htmlFor="telefono-cuenta">Teléfono</label>
                <input
                  id="telefono-cuenta"
                  name="telefono"
                  type="tel"
                  value={perfil.telefono}
                  onChange={cambiarCampo}
                  autoComplete="tel"
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div className={styles.aviso}>
                <span className={styles.iconoAviso} aria-hidden="true"><i className="fa-solid fa-shield-halved" /></span>
                <p>Nombre y teléfono se guardan en tu cuenta. El email y las opciones de seguridad tienen un flujo de verificación separado.</p>
              </div>

              {error && <p className={styles.error} role="alert">{error}</p>}
              {mensaje && <p className={styles.exito} role="status">{mensaje}</p>}

              <div className={styles.acciones}>
                <Link to="/mi-cuenta">Volver al resumen</Link>
                <button className={styles.guardarCambios} type="submit" disabled={!tieneCambios || guardando}>
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>

          <section className={styles.tarjeta} aria-labelledby="titulo-seguridad">
            <div className={styles.cabeceraTarjeta}>
              <div>
                <h2 id="titulo-seguridad">Seguridad</h2>
                <p>Las acciones sensibles requieren verificación adicional.</p>
              </div>
            </div>
            <div className={styles.ajustesSeguridad}>
              <div className={styles.ajuste}>
                <div>
                  <strong>Contraseña</strong>
                  <p>Nunca mostramos tu contraseña actual.</p>
                </div>
                <button type="button" className={styles.accionSeguridad} onClick={abrirCambioContrasena}>
                  Cambiar contraseña
                </button>
              </div>
              <div className={styles.ajuste}>
                <div>
                  <strong>Sesiones activas</strong>
                  <p>Cierra el acceso en este y todos los demás dispositivos.</p>
                </div>
                <button type="button" className={styles.accionDestructiva} onClick={abrirCierreSesiones}>
                  Cerrar sesiones
                </button>
              </div>
            </div>
          </section>
        </main>

      {modalContrasenaAbierto && (
        <div
          className={styles.modalFondo}
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarCambioContrasena();
          }}
        >
          <section
            className={styles.modalContrasena}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cambio-contrasena"
            onKeyDown={(evento) => {
              if (evento.key === "Escape") cerrarCambioContrasena();
            }}
          >
            <header className={styles.modalCabecera}>
              <div>
                <p className={styles.eyebrow}>Seguridad</p>
                <h2 id="titulo-cambio-contrasena">Cambiar contraseña</h2>
              </div>
              <button type="button" className={styles.cerrarModal} onClick={cerrarCambioContrasena} disabled={guardandoContrasena} aria-label="Cerrar">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <form className={styles.formularioContrasena} onSubmit={guardarContrasena} noValidate>
              <p className={styles.introduccionModal}>Usa una contraseña nueva de al menos 12 caracteres. Tu sesión actual seguirá abierta.</p>
              <label className={styles.campoContrasena} htmlFor="contrasena-actual">
                Contraseña actual
                <input id="contrasena-actual" name="contrasenaActual" type="password" autoComplete="current-password" value={contrasenas.contrasenaActual} onChange={cambiarCampoContrasena} autoFocus required />
              </label>
              <label className={styles.campoContrasena} htmlFor="contrasena-nueva">
                Nueva contraseña
                <input id="contrasena-nueva" name="contrasenaNueva" type="password" autoComplete="new-password" value={contrasenas.contrasenaNueva} onChange={cambiarCampoContrasena} required />
              </label>
              <label className={styles.campoContrasena} htmlFor="confirmacion-contrasena">
                Repite la nueva contraseña
                <input id="confirmacion-contrasena" name="confirmacion" type="password" autoComplete="new-password" value={contrasenas.confirmacion} onChange={cambiarCampoContrasena} required />
              </label>

              <div className={styles.avisoSesiones}>
                <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                <p>Al confirmar, cerraremos las sesiones activas en otros dispositivos.</p>
              </div>
              {errorContrasena && <p className={styles.errorModal} role="alert">{errorContrasena}</p>}

              <div className={styles.accionesModal}>
                <button type="button" className={styles.cancelarModal} onClick={cerrarCambioContrasena} disabled={guardandoContrasena}>Cancelar</button>
                <button type="submit" className={styles.confirmarContrasena} disabled={guardandoContrasena}>
                  {guardandoContrasena ? "Actualizando…" : "Actualizar contraseña"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modalSesionesAbierto && (
        <div
          className={styles.modalFondo}
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarCierreSesiones();
          }}
        >
          <section
            className={styles.modalContrasena}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cierre-sesiones"
            onKeyDown={(evento) => {
              if (evento.key === "Escape") cerrarCierreSesiones();
            }}
          >
            <header className={styles.modalCabecera}>
              <div>
                <p className={styles.eyebrow}>Seguridad</p>
                <h2 id="titulo-cierre-sesiones">Cerrar todas las sesiones</h2>
              </div>
              <button type="button" className={styles.cerrarModal} onClick={cerrarCierreSesiones} disabled={cerrandoSesiones} aria-label="Cerrar">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <div className={styles.confirmacionSesiones}>
              <span className={styles.iconoConfirmacion} aria-hidden="true"><i className="fa-solid fa-shield-halved" /></span>
              <p>Se cerrará tu sesión en este navegador y en todos los demás dispositivos donde hayas iniciado sesión.</p>
              <p className={styles.notaConfirmacion}>Para volver a entrar tendrás que usar tu email y contraseña.</p>
              {errorSesiones && <p className={styles.errorModal} role="alert">{errorSesiones}</p>}
              <div className={styles.accionesModal}>
                <button type="button" className={styles.cancelarModal} onClick={cerrarCierreSesiones} disabled={cerrandoSesiones}>Cancelar</button>
                <button type="button" className={styles.confirmarDestructivo} onClick={confirmarCierreSesiones} disabled={cerrandoSesiones}>
                  {cerrandoSesiones ? "Cerrando…" : "Cerrar sesiones"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </CuentaShell>
  );
}

export default DatosCuenta;
