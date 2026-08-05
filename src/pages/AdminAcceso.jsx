import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ErrorAdminApi,
  iniciarSesionAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminAcceso.module.css";

// Página de acceso del personal, independiente de las secciones. Si ya hay
// sesión, no muestra el login: manda directo al Resumen (la portada del panel).
export default function AdminAcceso() {
  const navegar = useNavigate();
  const [sesion, setSesion] = useState(undefined); // undefined=comprobando, null=sin sesión, obj=logueado
  const [credenciales, setCredenciales] = useState({ email: "", contrasena: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerSesionAdmin()
      .then((usuario) => { if (vigente) setSesion(usuario); })
      .catch(() => { if (vigente) setSesion(null); }); // sin red → mostramos el form igual
    return () => { vigente = false; };
  }, []);

  const cambiar = (campo) => (evento) => {
    setCredenciales((actuales) => ({ ...actuales, [campo]: evento.target.value }));
    setError(null);
  };

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesionAdmin({
        email: credenciales.email.trim(),
        contrasena: credenciales.contrasena,
      });
      navegar("/admin/resumen", { replace: true });
    } catch (errorRespuesta) {
      setError(
        errorRespuesta instanceof ErrorAdminApi
          ? errorRespuesta.message
          : "No pudimos conectar con el panel. Inténtalo nuevamente.",
      );
      setEnviando(false);
    }
  }

  if (sesion === undefined) {
    return (
      <main className={styles.accesoPantalla}>
        <p role="status">Comprobando acceso al panel…</p>
      </main>
    );
  }

  // Ya autenticado: a la portada del panel.
  if (sesion) {
    return <Navigate to="/admin/resumen" replace />;
  }

  return (
    <main className={styles.accesoPantalla}>
      <section className={styles.accesoCaja} aria-labelledby="titulo-admin-acceso">
        <div className={styles.accesoMarca}>Sumarket<em>Admin</em></div>
        <div className={styles.accesoContenido}>
          <h1 id="titulo-admin-acceso">Acceso del personal</h1>
          <p>Ingresa con una cuenta administradora u operadora.</p>
          <form onSubmit={enviar} className={styles.accesoFormulario}>
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={credenciales.email}
              onChange={cambiar("email")}
              maxLength="255"
              required
            />
            <label htmlFor="admin-contrasena">Contraseña</label>
            <input
              id="admin-contrasena"
              type="password"
              autoComplete="current-password"
              value={credenciales.contrasena}
              onChange={cambiar("contrasena")}
              required
            />
            {error && <p className={styles.mensajeError} role="alert">{error}</p>}
            <button type="submit" disabled={enviando}>
              {enviando ? "Comprobando…" : "Entrar al panel"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
