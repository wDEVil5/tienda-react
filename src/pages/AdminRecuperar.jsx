import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ErrorAdminApi,
  restablecerContrasenaConTokenAdmin,
  solicitarRecuperacionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminAcceso.module.css";

// Shell del acceso del personal, reutilizado para las pantallas de recuperación.
function Marco({ titulo, tituloId, children }) {
  return (
    <main className={styles.accesoPantalla}>
      <section className={styles.accesoCaja} aria-labelledby={tituloId}>
        <div className={styles.accesoMarca}>
          Sumarket<em>Admin</em>
        </div>
        <div className={styles.accesoContenido}>
          <h1 id={tituloId}>{titulo}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}

// Paso 1: pedir el enlace. Respuesta genérica (no revela si el correo pertenece
// a una cuenta del personal): mostramos siempre el mismo mensaje.
export function AdminRecuperarContrasena() {
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await solicitarRecuperacionAdmin(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(
        err instanceof ErrorAdminApi
          ? err.message
          : "No pudimos procesar la solicitud. Inténtalo de nuevo.",
      );
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Marco titulo="Revisa tu correo" tituloId="titulo-admin-recuperar">
        <p>
          Si <strong>{email.trim()}</strong> pertenece a una cuenta del personal, te
          enviamos un enlace para elegir una nueva contraseña. Revisa tu bandeja (y el
          spam); el enlace vence en 1 hora.
        </p>
        <div className={styles.accesoFormulario}>
          <button type="button" onClick={() => navegar("/admin/acceso")}>
            Volver al acceso
          </button>
        </div>
      </Marco>
    );
  }

  return (
    <Marco titulo="Recuperar contraseña" tituloId="titulo-admin-recuperar">
      <p>Te enviaremos un enlace a tu correo para restablecerla.</p>
      <form onSubmit={enviar} className={styles.accesoFormulario}>
        <label htmlFor="admin-email-recuperar">Email</label>
        <input
          id="admin-email-recuperar"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          maxLength="255"
          required
        />
        {error && (
          <p className={styles.mensajeError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando || !email.trim()}>
          {enviando ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
      <Link className={styles.enlaceVolver} to="/admin/acceso">
        Volver al acceso
      </Link>
    </Marco>
  );
}

// Paso 2: llegar desde el enlace del correo (?token=) y elegir la nueva clave.
export function AdminRestablecerContrasena() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [contrasena, setContrasena] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    if (contrasena.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await restablecerContrasenaConTokenAdmin(token, contrasena);
      setListo(true);
    } catch (err) {
      setError(
        err instanceof ErrorAdminApi
          ? err.message
          : "No pudimos cambiar la contraseña. Inténtalo de nuevo.",
      );
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <Marco titulo="Enlace inválido" tituloId="titulo-admin-restablecer">
        <p>El enlace no trae un código válido. Pide uno nuevo desde "Olvidé mi contraseña".</p>
        <div className={styles.accesoFormulario}>
          <button type="button" onClick={() => navegar("/admin/recuperar-contrasena")}>
            Pedir un enlace nuevo
          </button>
        </div>
      </Marco>
    );
  }

  if (listo) {
    return (
      <Marco titulo="Contraseña actualizada" tituloId="titulo-admin-restablecer">
        <p>
          Listo. Cerramos tus otras sesiones por seguridad; ya puedes entrar al panel con tu
          nueva contraseña.
        </p>
        <div className={styles.accesoFormulario}>
          <button type="button" onClick={() => navegar("/admin/acceso")}>
            Ir al acceso
          </button>
        </div>
      </Marco>
    );
  }

  return (
    <Marco titulo="Elige una nueva contraseña" tituloId="titulo-admin-restablecer">
      <p>Debe tener al menos 12 caracteres.</p>
      <form onSubmit={enviar} className={styles.accesoFormulario}>
        <label htmlFor="admin-nueva-contrasena">Nueva contraseña</label>
        <input
          id="admin-nueva-contrasena"
          type={mostrar ? "text" : "password"}
          autoComplete="new-password"
          value={contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
          minLength="12"
          required
        />
        <label className={styles.mostrarClave}>
          <input
            type="checkbox"
            checked={mostrar}
            onChange={(evento) => setMostrar(evento.target.checked)}
          />
          Mostrar contraseña
        </label>
        {error && (
          <p className={styles.mensajeError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </Marco>
  );
}
