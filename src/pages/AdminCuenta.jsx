import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  cambiarContrasenaAdmin,
  cerrarSesionAdmin,
  ErrorAdminApi,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminCuenta.module.css";

const ETIQUETA_ROL = { ADMIN: "Administrador", OPERADOR: "Operador" };

export default function AdminCuenta() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [saliendo, setSaliendo] = useState(false);
  const [errorSalir, setErrorSalir] = useState(null);

  const [clave, setClave] = useState({ actual: "", nueva: "", confirmar: "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }

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
    // Sin sesión (incluye el después de cerrar sesión): al login del personal.
    return <Navigate to="/admin/productos" replace />;
  }

  async function cerrarSesion() {
    setSaliendo(true);
    setErrorSalir(null);
    try {
      await cerrarSesionAdmin();
      setUsuario(null); // dispara el Navigate al login
    } catch {
      setErrorSalir("No pudimos cerrar la sesión. Inténtalo de nuevo.");
      setSaliendo(false);
    }
  }

  async function cambiarContrasena(evento) {
    evento.preventDefault();
    setMensaje(null);

    // Validación en el cliente antes de molestar al servidor (que igual valida).
    if (clave.nueva.length < 12) {
      setMensaje({ tipo: "error", texto: "La nueva contraseña debe tener al menos 12 caracteres." });
      return;
    }
    if (clave.nueva !== clave.confirmar) {
      setMensaje({ tipo: "error", texto: "La confirmación no coincide con la nueva contraseña." });
      return;
    }

    setGuardando(true);
    try {
      await cambiarContrasenaAdmin(clave.actual, clave.nueva);
      setMensaje({ tipo: "ok", texto: "Contraseña actualizada." });
      setClave({ actual: "", nueva: "", confirmar: "" });
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setMensaje({
        tipo: "error",
        texto:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos cambiar la contraseña.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Cuenta">
        <div className={styles.pagina}>
          <header className={styles.cabecera}>
            <span className={styles.avatar} aria-hidden="true">
              {usuario.nombre?.charAt(0).toUpperCase() ?? "?"}
            </span>
            <div className={styles.identidad}>
              <h1 className={styles.nombre}>{usuario.nombre}</h1>
              <p className={styles.email}>{usuario.email}</p>
              <span className={styles.rolBadge}>{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</span>
            </div>
          </header>

          <section className={styles.tarjeta}>
            <h2 className={styles.tarjetaTitulo}>Seguridad</h2>

            <form className={styles.formulario} onSubmit={cambiarContrasena}>
              <p className={styles.filaTitulo}>Cambiar contraseña</p>
              <label className={styles.campo}>
                <span>Contraseña actual</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={clave.actual}
                  onChange={(evento) =>
                    setClave((previo) => ({ ...previo, actual: evento.target.value }))
                  }
                  required
                />
              </label>
              <label className={styles.campo}>
                <span>Nueva contraseña</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={clave.nueva}
                  onChange={(evento) =>
                    setClave((previo) => ({ ...previo, nueva: evento.target.value }))
                  }
                  minLength={12}
                  required
                />
              </label>
              <label className={styles.campo}>
                <span>Confirmar nueva</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={clave.confirmar}
                  onChange={(evento) =>
                    setClave((previo) => ({ ...previo, confirmar: evento.target.value }))
                  }
                  required
                />
              </label>
              <div className={styles.formAcciones}>
                <button type="submit" className={styles.botonGuardar} disabled={guardando}>
                  {guardando ? "Guardando…" : "Actualizar contraseña"}
                </button>
                {mensaje && (
                  <span
                    className={mensaje.tipo === "ok" ? styles.mensajeOk : styles.mensajeError}
                    role="status"
                  >
                    {mensaje.texto}
                  </span>
                )}
              </div>
            </form>

            <hr className={styles.separador} />

            <div className={styles.fila}>
              <div className={styles.filaInfo}>
                <p className={styles.filaTitulo}>Cerrar sesión</p>
                <p className={styles.filaNota}>Cierra tu sesión del panel en este dispositivo.</p>
              </div>
              <button
                type="button"
                className={styles.botonSalir}
                onClick={cerrarSesion}
                disabled={saliendo}
              >
                {saliendo ? "Saliendo…" : "Cerrar sesión"}
              </button>
            </div>

            {errorSalir && (
              <p className={styles.error} role="alert">
                {errorSalir}
              </p>
            )}
          </section>
        </div>
      </AdminShell>
    </main>
  );
}
