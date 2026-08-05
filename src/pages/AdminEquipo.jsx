import { Fragment, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  activarUsuarioAdmin,
  crearOperadorAdmin,
  desactivarUsuarioAdmin,
  eliminarUsuarioAdmin,
  ErrorAdminApi,
  listarUsuariosAdmin,
  obtenerSesionAdmin,
  restablecerContrasenaUsuarioAdmin,
} from "../services/adminApi.js";
import styles from "./AdminEquipo.module.css";

const ETIQUETA_ROL = { ADMIN: "Administrador", OPERADOR: "Operador" };

export default function AdminEquipo() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [usuarios, setUsuarios] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  const [accionId, setAccionId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const [reseteandoId, setReseteandoId] = useState(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [mensajeReset, setMensajeReset] = useState(null); // { id, tipo, texto }

  const [confirmarId, setConfirmarId] = useState(null); // fila mostrando "¿eliminar?"
  const [eliminandoId, setEliminandoId] = useState(null);

  const [form, setForm] = useState({ nombre: "", email: "", contrasena: "" });
  const [creando, setCreando] = useState(false);
  const [mensajeCrear, setMensajeCrear] = useState(null); // { tipo, texto }

  const esAdmin = usuario?.rol === "ADMIN";

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
    if (!esAdmin) return undefined;
    let vigente = true;

    listarUsuariosAdmin()
      .then((data) => {
        if (!vigente) return;
        setUsuarios(Array.isArray(data) ? data : []);
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
  }, [esAdmin, intento]);

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

  async function alternarActivo(fila) {
    setAccionId(fila.id);
    setErrorAccion(null);
    try {
      if (fila.activo) await desactivarUsuarioAdmin(fila.id);
      else await activarUsuarioAdmin(fila.id);
      setIntento((valor) => valor + 1);
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setErrorAccion({
        id: fila.id,
        mensaje:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos actualizar la cuenta.",
      });
    } finally {
      setAccionId(null);
    }
  }

  function abrirReset(id) {
    setConfirmarId(null); // no dejar dos paneles abiertos a la vez
    setReseteandoId(id);
    setNuevaClave("");
    setMensajeReset(null);
  }

  function cerrarReset() {
    setReseteandoId(null);
    setNuevaClave("");
  }

  async function guardarReset(fila, evento) {
    evento.preventDefault();
    setMensajeReset(null);
    if (nuevaClave.length < 12) {
      setMensajeReset({ id: fila.id, tipo: "error", texto: "Mínimo 12 caracteres." });
      return;
    }
    setGuardandoClave(true);
    try {
      await restablecerContrasenaUsuarioAdmin(fila.id, nuevaClave);
      setMensajeReset({ id: fila.id, tipo: "ok", texto: "Contraseña actualizada." });
      setNuevaClave("");
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setMensajeReset({
        id: fila.id,
        tipo: "error",
        texto:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos actualizar la contraseña.",
      });
    } finally {
      setGuardandoClave(false);
    }
  }

  async function eliminar(fila) {
    setEliminandoId(fila.id);
    setErrorAccion(null);
    try {
      await eliminarUsuarioAdmin(fila.id);
      setConfirmarId(null);
      setIntento((valor) => valor + 1); // recarga la lista
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setErrorAccion({
        id: fila.id,
        mensaje:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos eliminar la cuenta.",
      });
    } finally {
      setEliminandoId(null);
    }
  }

  async function crear(evento) {
    evento.preventDefault();
    setMensajeCrear(null);
    if (form.contrasena.length < 12) {
      setMensajeCrear({ tipo: "error", texto: "La contraseña debe tener al menos 12 caracteres." });
      return;
    }
    setCreando(true);
    try {
      await crearOperadorAdmin({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        contrasena: form.contrasena,
      });
      setMensajeCrear({ tipo: "ok", texto: "Operador creado." });
      setForm({ nombre: "", email: "", contrasena: "" });
      setIntento((valor) => valor + 1);
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setMensajeCrear({
        tipo: "error",
        texto:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos crear el operador.",
      });
    } finally {
      setCreando(false);
    }
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Equipo">
        <div className={styles.pagina}>
          <header className={styles.cabecera}>
            <h1 className={styles.titulo}>Equipo</h1>
          </header>

          {!esAdmin ? (
            <section className={styles.tarjeta}>
              <p className={styles.soloAdmin}>
                Esta sección es solo para administradores. Pídele a un administrador que gestione
                las cuentas del equipo.
              </p>
            </section>
          ) : (
            <div className={styles.cuerpo}>
              <section className={styles.tarjeta}>
                <h2 className={styles.tarjetaTitulo}>Agregar operador</h2>
                <form className={styles.formulario} onSubmit={crear}>
                  <label className={styles.campo}>
                    <span>Nombre</span>
                    <input
                      value={form.nombre}
                      onChange={(evento) =>
                        setForm((previo) => ({ ...previo, nombre: evento.target.value }))
                      }
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </label>
                  <label className={styles.campo}>
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="off"
                      value={form.email}
                      onChange={(evento) =>
                        setForm((previo) => ({ ...previo, email: evento.target.value }))
                      }
                      maxLength={255}
                      required
                    />
                  </label>
                  <label className={styles.campo}>
                    <span>Contraseña temporal</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={form.contrasena}
                      onChange={(evento) =>
                        setForm((previo) => ({ ...previo, contrasena: evento.target.value }))
                      }
                      minLength={12}
                      required
                    />
                  </label>
                  <div className={styles.formAcciones}>
                    <button type="submit" className={styles.botonCrear} disabled={creando}>
                      {creando ? "Creando…" : "Crear operador"}
                    </button>
                    {mensajeCrear && (
                      <span
                        className={
                          mensajeCrear.tipo === "ok" ? styles.mensajeOk : styles.mensajeError
                        }
                        role="status"
                      >
                        {mensajeCrear.texto}
                      </span>
                    )}
                  </div>
                </form>
              </section>

              <section className={styles.tarjeta}>
                <h2 className={styles.tarjetaTitulo}>Cuentas</h2>
                {cargando && !usuarios ? (
                  <p className={styles.estado} role="status">Cargando cuentas…</p>
                ) : error ? (
                  <div className={styles.estado} role="alert">
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
                ) : (
                  <div className={styles.tablaScroll}>
                    <table className={styles.tabla}>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Rol</th>
                          <th>Estado</th>
                          <th className={styles.colAccion}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(usuarios ?? []).map((fila) => {
                          const esYo = fila.id === usuario.id;
                          const gestionable = fila.rol !== "ADMIN" && !esYo;
                          const ocupado = accionId === fila.id;
                          return (
                            <Fragment key={fila.id}>
                              <tr>
                                <td className={styles.celdaNombre}>
                                  {fila.nombre}
                                  {esYo && <span className={styles.tuChip}>tú</span>}
                                </td>
                                <td className={styles.celdaEmail}>{fila.email}</td>
                                <td>
                                  <span className={styles.rolBadge}>
                                    {ETIQUETA_ROL[fila.rol] ?? fila.rol}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={fila.activo ? styles.estadoActivo : styles.estadoInactivo}
                                  >
                                    {fila.activo ? "Activo" : "Inactivo"}
                                  </span>
                                </td>
                                <td className={styles.colAccion}>
                                  {!gestionable ? (
                                    <span className={styles.sinAccion}>—</span>
                                  ) : confirmarId === fila.id ? (
                                    <div className={styles.confirmarFila}>
                                      <span className={styles.confirmarTexto}>
                                        ¿Eliminar a {fila.nombre}?
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.botonEliminarConfirmar}
                                        disabled={eliminandoId === fila.id}
                                        onClick={() => eliminar(fila)}
                                      >
                                        {eliminandoId === fila.id ? "Eliminando…" : "Sí, eliminar"}
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.botonCancelar}
                                        onClick={() => setConfirmarId(null)}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className={styles.accionesFila}>
                                      <button
                                        type="button"
                                        className={styles.botonReset}
                                        onClick={() =>
                                          reseteandoId === fila.id ? cerrarReset() : abrirReset(fila.id)
                                        }
                                      >
                                        Resetear
                                      </button>
                                      <button
                                        type="button"
                                        className={
                                          fila.activo ? styles.botonDesactivar : styles.botonActivar
                                        }
                                        disabled={ocupado}
                                        onClick={() => alternarActivo(fila)}
                                      >
                                        {ocupado ? "…" : fila.activo ? "Desactivar" : "Activar"}
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.botonEliminar}
                                        onClick={() => {
                                          cerrarReset();
                                          setConfirmarId(fila.id);
                                        }}
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  )}
                                  {errorAccion?.id === fila.id && (
                                    <p className={styles.errorAccion} role="alert">
                                      {errorAccion.mensaje}
                                    </p>
                                  )}
                                </td>
                              </tr>

                              {reseteandoId === fila.id && (
                                <tr className={styles.filaReset}>
                                  <td colSpan={5}>
                                    <form
                                      className={styles.resetForm}
                                      onSubmit={(evento) => guardarReset(fila, evento)}
                                    >
                                      <label className={styles.campoReset}>
                                        <span>Nueva contraseña para {fila.nombre}</span>
                                        <input
                                          type="password"
                                          autoComplete="new-password"
                                          value={nuevaClave}
                                          onChange={(evento) => setNuevaClave(evento.target.value)}
                                          minLength={12}
                                          required
                                        />
                                      </label>
                                      <div className={styles.resetAcciones}>
                                        <button
                                          type="submit"
                                          className={styles.botonGuardarClave}
                                          disabled={guardandoClave}
                                        >
                                          {guardandoClave ? "Guardando…" : "Guardar"}
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.botonCancelar}
                                          onClick={cerrarReset}
                                        >
                                          Cancelar
                                        </button>
                                        {mensajeReset?.id === fila.id && (
                                          <span
                                            className={
                                              mensajeReset.tipo === "ok"
                                                ? styles.mensajeOk
                                                : styles.mensajeError
                                            }
                                            role="status"
                                          >
                                            {mensajeReset.texto}
                                          </span>
                                        )}
                                      </div>
                                    </form>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </AdminShell>
    </main>
  );
}
