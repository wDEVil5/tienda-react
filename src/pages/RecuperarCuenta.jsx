import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ErrorCuentaApi,
  restablecerContrasenaCuenta,
  solicitarRecuperacionCuenta,
} from "../services/cuentaApi.js";
import styles from "./Acceso.module.css";

// Shell compartido con las pantallas de acceso (pantalla completa, sin header/
// footer de la tienda). Se apoya en Acceso.module.css para no duplicar estilos.
function Marco({ titulo, tituloId, children }) {
  return (
    <section className={styles.pantalla} aria-labelledby={tituloId}>
      <header className={styles.cabecera}>
        <Link to="/" className={styles.logo}>
          <span aria-hidden="true">←</span> Volver a la tienda
        </Link>
      </header>
      <div className={styles.contenido}>
        <h1 id={tituloId} className={styles.titulo}>
          {titulo}
        </h1>
        {children}
      </div>
    </section>
  );
}

// Paso 1: pedir el enlace. La respuesta de la API es genérica (no revela si el
// correo existe), así que mostramos SIEMPRE el mismo mensaje de "revisa tu correo".
export function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await solicitarRecuperacionCuenta(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(
        err instanceof ErrorCuentaApi
          ? err.message
          : "No pudimos procesar la solicitud. Inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Marco titulo="Revisa tu correo" tituloId="titulo-recuperar">
        <p className={styles.intro}>
          Si <strong>{email.trim()}</strong> está registrado, te enviamos un enlace para
          elegir una nueva contraseña. Revisa tu bandeja de entrada (y el spam); el enlace
          vence en 1 hora.
        </p>
        <Link className={styles.enviar} to="/login">
          Volver a entrar
        </Link>
      </Marco>
    );
  }

  return (
    <Marco titulo="Recupera tu contraseña" tituloId="titulo-recuperar">
      <p className={styles.intro}>Te enviaremos un enlace a tu correo para crear una nueva.</p>
      <form className={styles.formulario} onSubmit={enviar} noValidate>
        <div className={styles.grupo}>
          <label htmlFor="email-recuperar">Correo</label>
          <input
            id="email-recuperar"
            className={styles.input}
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.cl"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.enviar} type="submit" disabled={enviando || !email.trim()}>
          {enviando ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
      <p className={styles.alternativa}>
        <Link to="/login">Volver a entrar</Link>
      </p>
    </Marco>
  );
}

// Paso 2: llegar desde el enlace del correo (?token=) y elegir la nueva clave.
export function RestablecerContrasena() {
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
      await restablecerContrasenaCuenta(token, contrasena);
      setListo(true);
    } catch (err) {
      setError(
        err instanceof ErrorCuentaApi
          ? err.message
          : "No pudimos cambiar la contraseña. Inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <Marco titulo="Enlace inválido" tituloId="titulo-restablecer">
        <p className={styles.intro}>
          El enlace no trae un código válido. Pide uno nuevo desde "Olvidé mi contraseña".
        </p>
        <Link className={styles.enviar} to="/recuperar-contrasena">
          Pedir un enlace nuevo
        </Link>
      </Marco>
    );
  }

  if (listo) {
    return (
      <Marco titulo="Contraseña actualizada" tituloId="titulo-restablecer">
        <p className={styles.intro}>
          Listo. Cerramos tus otras sesiones por seguridad; ya puedes entrar con tu nueva
          contraseña.
        </p>
        <Link className={styles.enviar} to="/login">
          Ir a entrar
        </Link>
      </Marco>
    );
  }

  return (
    <Marco titulo="Elige una nueva contraseña" tituloId="titulo-restablecer">
      <p className={styles.intro}>Debe tener al menos 12 caracteres.</p>
      <form className={styles.formulario} onSubmit={enviar} noValidate>
        <div className={styles.grupo}>
          <label htmlFor="nueva-contrasena">Nueva contraseña</label>
          <span className={styles.campoConAccion}>
            <input
              id="nueva-contrasena"
              className={styles.input}
              type={mostrar ? "text" : "password"}
              autoComplete="new-password"
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              required
            />
            <button
              type="button"
              className={styles.mostrarContrasena}
              onClick={() => setMostrar((valor) => !valor)}
            >
              {mostrar ? "Ocultar" : "Ver"}
            </button>
          </span>
          <p className={styles.ayuda}>Mínimo 12 caracteres.</p>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.enviar} type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </Marco>
  );
}
