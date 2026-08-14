import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  guardarIdentidadAdmin,
  obtenerIdentidadAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminIdentidad.module.css";

// Editor de "Identidad de la tienda": nombre, contacto, dirección, horario y
// redes. El backend expone GET/PUT /api/admin/identidad; esta pantalla es su
// interfaz. Guardar es un PUT con TODO el formulario, igual que en Envíos.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El formulario trabaja con strings (los opcionales vacíos = ""). Se validan
// espejando el contrato Zod del backend y se manda tal cual (el backend
// normaliza "" → null en los opcionales).
function identidadAFormulario(identidad) {
  return {
    nombre: identidad.nombre ?? "",
    email: identidad.email ?? "",
    telefono: identidad.telefono ?? "",
    direccion: identidad.direccion ?? "",
    horarioAtencion: identidad.horarioAtencion ?? "",
    whatsapp: identidad.whatsapp ?? "",
    instagram: identidad.instagram ?? "",
    facebook: identidad.facebook ?? "",
    tiktok: identidad.tiktok ?? "",
  };
}

// Valida el formulario y arma el payload. Devuelve { datos } o { error } con un
// mensaje claro, para fallar temprano sin red.
function construirPayload(form) {
  const nombre = form.nombre.trim();
  if (nombre.length < 2 || nombre.length > 120) return { error: "El nombre debe tener entre 2 y 120 caracteres." };

  const email = form.email.trim();
  if (!EMAIL_RE.test(email) || email.length > 255) return { error: "Ingresa un email válido." };

  const telefono = form.telefono.trim();
  if (telefono.length < 3 || telefono.length > 40) return { error: "El teléfono debe tener entre 3 y 40 caracteres." };

  const direccion = form.direccion.trim();
  if (direccion.length < 3 || direccion.length > 200) return { error: "La dirección debe tener entre 3 y 200 caracteres." };

  const horarioAtencion = form.horarioAtencion.trim();
  if (horarioAtencion.length < 2 || horarioAtencion.length > 120) return { error: "El horario de atención debe tener entre 2 y 120 caracteres." };

  const opcional = (valor, max, etiqueta) => {
    const texto = valor.trim();
    if (texto.length > max) return { error: `${etiqueta} no puede superar ${max} caracteres.` };
    return { valor: texto };
  };

  const wa = opcional(form.whatsapp, 40, "El WhatsApp");
  if (wa.error) return wa;
  const ig = opcional(form.instagram, 255, "El Instagram");
  if (ig.error) return ig;
  const fb = opcional(form.facebook, 255, "El Facebook");
  if (fb.error) return fb;
  const tk = opcional(form.tiktok, 255, "El TikTok");
  if (tk.error) return tk;

  return {
    datos: {
      nombre,
      email,
      telefono,
      direccion,
      horarioAtencion,
      whatsapp: wa.valor,
      instagram: ig.valor,
      facebook: fb.valor,
      tiktok: tk.valor,
    },
  };
}

export default function AdminIdentidad() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }

  const esAdmin = usuario?.rol === "ADMIN";

  useEffect(() => {
    let vigente = true;
    obtenerSesionAdmin()
      .then((sesion) => {
        if (!vigente) return;
        setErrorAcceso(null);
        setUsuario(sesion);
      })
      .catch((errorSesion) => {
        if (!vigente) return;
        setErrorAcceso(
          errorSesion instanceof ErrorAdminApi
            ? errorSesion.message
            : "No pudimos comprobar el acceso al panel.",
        );
        setUsuario(null);
      });
    return () => {
      vigente = false;
    };
  }, [intentoAcceso]);

  useEffect(() => {
    if (!esAdmin) return undefined;
    let vigente = true;

    obtenerIdentidadAdmin()
      .then((identidad) => {
        if (!vigente) return;
        setForm(identidadAFormulario(identidad));
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

    return () => {
      vigente = false;
    };
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

  function editar(campo, valor) {
    setMensaje(null);
    setForm((previo) => ({ ...previo, [campo]: valor }));
  }

  async function guardar(evento) {
    evento.preventDefault();
    setMensaje(null);

    const resultado = construirPayload(form);
    if (resultado.error) {
      setMensaje({ tipo: "error", texto: resultado.error });
      return;
    }

    setGuardando(true);
    try {
      const identidad = await guardarIdentidadAdmin(resultado.datos);
      setForm(identidadAFormulario(identidad));
      setMensaje({ tipo: "ok", texto: "Cambios guardados." });
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
            : "No pudimos guardar los cambios.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Identidad">
        <div className={styles.pagina}>
          <header className={styles.cabecera}>
            <h1 className={styles.titulo}>Identidad de la tienda</h1>
            <p className={styles.subtitulo}>
              Nombre, contacto y redes que ve el cliente en el footer y la marca.
            </p>
          </header>

          {!esAdmin ? (
            <section className={styles.tarjeta}>
              <p className={styles.soloAdmin}>
                Esta sección es solo para administradores. Pídele a un administrador que
                ajuste la identidad de la tienda.
              </p>
            </section>
          ) : cargando && !form ? (
            <p className={styles.estado} role="status">Cargando identidad…</p>
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
            form && (
              <form className={styles.cuerpo} onSubmit={guardar}>
                <section className={styles.tarjeta}>
                  <h2 className={styles.tarjetaTitulo}>Nombre y contacto</h2>
                  <div className={styles.grid2}>
                    <label className={styles.campo}>
                      <span>Nombre de la tienda</span>
                      <input
                        type="text"
                        maxLength={120}
                        value={form.nombre}
                        onChange={(e) => editar("nombre", e.target.value)}
                        placeholder="SumarketExpress"
                      />
                    </label>
                    <label className={styles.campo}>
                      <span>Email de contacto</span>
                      <input
                        type="email"
                        maxLength={255}
                        value={form.email}
                        onChange={(e) => editar("email", e.target.value)}
                        placeholder="hola@tutienda.cl"
                      />
                    </label>
                    <label className={styles.campo}>
                      <span>Teléfono</span>
                      <input
                        type="text"
                        maxLength={40}
                        value={form.telefono}
                        onChange={(e) => editar("telefono", e.target.value)}
                        placeholder="+56 9 1234 5678"
                      />
                    </label>
                    <label className={styles.campo}>
                      <span>WhatsApp (opcional)</span>
                      <input
                        type="text"
                        maxLength={40}
                        value={form.whatsapp}
                        onChange={(e) => editar("whatsapp", e.target.value)}
                        placeholder="+56 9 1234 5678"
                      />
                      <small className={styles.ayuda}>Déjalo vacío si no usas WhatsApp.</small>
                    </label>
                  </div>
                </section>

                <section className={styles.tarjeta}>
                  <h2 className={styles.tarjetaTitulo}>Ubicación y horario</h2>
                  <div className={styles.grid2}>
                    <label className={styles.campo}>
                      <span>Dirección</span>
                      <input
                        type="text"
                        maxLength={200}
                        value={form.direccion}
                        onChange={(e) => editar("direccion", e.target.value)}
                        placeholder="Av. Matta 980, Santiago"
                      />
                    </label>
                    <label className={styles.campo}>
                      <span>Horario de atención</span>
                      <input
                        type="text"
                        maxLength={120}
                        value={form.horarioAtencion}
                        onChange={(e) => editar("horarioAtencion", e.target.value)}
                        placeholder="Lun a sáb 09-21h · Dom 10-15h"
                      />
                    </label>
                  </div>
                </section>

                <section className={styles.tarjeta}>
                  <h2 className={styles.tarjetaTitulo}>Redes sociales</h2>
                  <p className={styles.notaRedes}>
                    Deja vacía cualquiera que no uses: no se mostrará en la tienda.
                  </p>
                  <div className={styles.grid3}>
                    <label className={styles.campo}>
                      <span>Instagram</span>
                      <input
                        type="url"
                        maxLength={255}
                        value={form.instagram}
                        onChange={(e) => editar("instagram", e.target.value)}
                        placeholder="https://instagram.com/tutienda"
                      />
                    </label>
                    <label className={styles.campo}>
                      <span>Facebook</span>
                      <input
                        type="url"
                        maxLength={255}
                        value={form.facebook}
                        onChange={(e) => editar("facebook", e.target.value)}
                        placeholder="https://facebook.com/tutienda"
                      />
                    </label>
                    <label className={styles.campo}>
                      <span>TikTok</span>
                      <input
                        type="url"
                        maxLength={255}
                        value={form.tiktok}
                        onChange={(e) => editar("tiktok", e.target.value)}
                        placeholder="https://tiktok.com/@tutienda"
                      />
                    </label>
                  </div>
                </section>

                <div className={styles.barraGuardar}>
                  <button type="submit" className={styles.botonGuardar} disabled={guardando}>
                    {guardando ? "Guardando…" : "Guardar cambios"}
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
            )
          )}
        </div>
      </AdminShell>
    </main>
  );
}
