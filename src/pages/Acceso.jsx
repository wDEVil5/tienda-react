import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorCuentaApi } from "../services/cuentaApi.js";
import { useCuenta } from "../context/CuentaContext.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import styles from "./Acceso.module.css";

const ESTADO_INICIAL_LOGIN = { email: "", contrasena: "" };
const ESTADO_INICIAL_REGISTRO = {
  nombre: "",
  email: "",
  telefono: "",
  contrasena: "",
};

function mensajeDeError(error, esRegistro) {
  if (!(error instanceof ErrorCuentaApi)) {
    return "No pudimos conectar con tu cuenta. Inténtalo nuevamente.";
  }
  if (error.code === "EMAIL_TAKEN") return "Ya existe una cuenta con este correo.";
  if (error.code === "INVALID_CREDENTIALS") return "Email o contraseña incorrectos.";
  if (error.code === "INVALID_ACCOUNT_DATA") {
    return esRegistro
      ? "Revisa los datos ingresados. La contraseña debe tener al menos 12 caracteres."
      : error.message;
  }
  return error.message;
}

function Campo({ id, etiqueta, error, ...props }) {
  return (
    <div className={styles.grupo}>
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} className={error ? styles.inputError : styles.input} {...props} />
    </div>
  );
}

function Acceso({ modo }) {
  const esRegistro = modo === "registro";
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { iniciarSesion, registrar, estaAutenticado } = useCuenta();
  const { totalItems } = useCarritoContext();
  const [datos, setDatos] = useState(
    esRegistro ? ESTADO_INICIAL_REGISTRO : ESTADO_INICIAL_LOGIN,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const destino = ubicacion.state?.desde?.pathname ?? "/";

  // No dejamos una pantalla de acceso abierta después de una sesión ya válida.
  if (estaAutenticado) {
    return <Navigate to={destino} replace />;
  }

  const cambiar = (campo) => (evento) => {
    setDatos((previo) => ({ ...previo, [campo]: evento.target.value }));
    if (error) setError(null);
  };

  async function enviarFormulario(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      if (esRegistro) {
        await registrar({
          nombre: datos.nombre.trim(),
          email: datos.email.trim(),
          contrasena: datos.contrasena,
          ...(datos.telefono.trim() ? { telefono: datos.telefono.trim() } : {}),
        });
      } else {
        await iniciarSesion({
          email: datos.email.trim(),
          contrasena: datos.contrasena,
        });
      }
      navegar(destino, { replace: true });
    } catch (errorRespuesta) {
      setError(mensajeDeError(errorRespuesta, esRegistro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={styles.pantalla} aria-labelledby="titulo-acceso">
      <header className={styles.cabecera}>
        <Link to="/" className={styles.logo}>
          Sumarket<em>Express</em>
        </Link>
      </header>

      <div className={styles.contenido}>
        <h1 id="titulo-acceso" className={styles.titulo}>
          {esRegistro ? "Crea tu cuenta" : "Entra a tu cuenta"}
        </h1>
        <p className={styles.intro}>
          {esRegistro
            ? "Guarda tus direcciones y revisa tus pedidos cuando quieras."
            : "Tus pedidos, direcciones y pagos en un solo lugar."}
        </p>

        <form className={styles.formulario} onSubmit={enviarFormulario} noValidate>
          {esRegistro && (
            <Campo
              id="nombre"
              etiqueta="Nombre"
              type="text"
              autoComplete="name"
              value={datos.nombre}
              onChange={cambiar("nombre")}
              minLength="2"
              maxLength="120"
              required
            />
          )}
          <Campo
            id="email"
            etiqueta="Email"
            type="email"
            autoComplete="email"
            value={datos.email}
            onChange={cambiar("email")}
            maxLength="255"
            required
          />
          {esRegistro && (
            <Campo
              id="telefono"
              etiqueta="Teléfono (opcional)"
              type="tel"
              autoComplete="tel"
              value={datos.telefono}
              onChange={cambiar("telefono")}
              maxLength="40"
            />
          )}
          <div className={styles.grupo}>
            <label htmlFor="contrasena">Contraseña</label>
            <span className={styles.campoConAccion}>
              <input
                id="contrasena"
                className={styles.input}
                type={mostrarContrasena ? "text" : "password"}
                autoComplete={esRegistro ? "new-password" : "current-password"}
                value={datos.contrasena}
                onChange={cambiar("contrasena")}
                minLength="12"
                maxLength="128"
                required
              />
              <button
                className={styles.mostrarContrasena}
                type="button"
                onClick={() => setMostrarContrasena((visible) => !visible)}
                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarContrasena ? "Ocultar" : "Ver"}
              </button>
            </span>
          </div>
          {esRegistro && (
            <p className={styles.ayuda}>Mínimo 12 caracteres.</p>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          {!esRegistro && (
            <div className={styles.opcionesSesion}>
              <span className={styles.mantenerSesion}>
                <span className={styles.checkSesion} aria-hidden="true">
                  <i className="fa-solid fa-check"></i>
                </span>
                Mantener sesión
              </span>
              <span
                className={styles.enlacePendiente}
                title="La recuperación de contraseña se habilitará con su endpoint de backend."
              >
                Olvidé mi contraseña
              </span>
            </div>
          )}

          <button className={styles.enviar} type="submit" disabled={enviando}>
            {enviando
              ? "Un momento…"
              : esRegistro
                ? "Crear cuenta"
                : "Entrar"}
          </button>
        </form>

        {!esRegistro && (
          <>
            <div className={styles.separador} aria-hidden="true"><span></span>o<span></span></div>
            <button
              className={styles.google}
              type="button"
              disabled
              title="Google se habilitará cuando exista la autenticación OAuth en el backend."
            >
              <span className={styles.googleIcono}>G</span>
              Continuar con Google
            </button>
            <p className={styles.notaGoogle}>
              Con Google no necesitas contraseña · el acceso se habilitará pronto.
            </p>
          </>
        )}

        <div className={styles.alternativa}>
          <span>{esRegistro ? "¿Ya tienes una cuenta?" : "¿Primera vez por aquí?"}</span>
          <Link to={esRegistro ? "/login" : "/registro"}>
            {esRegistro ? "Entrar" : "Crear cuenta"}
          </Link>
        </div>

        {!esRegistro && (
          <p className={styles.notaCarrito}>
            {totalItems > 0
              ? `Los ${totalItems} ${totalItems === 1 ? "producto" : "productos"} de tu carrito se conservarán y se asociarán a tu cuenta al entrar.`
              : "Tu carrito se conservará y se asociará a tu cuenta al entrar."}
          </p>
        )}
      </div>
    </section>
  );
}

export function Login() {
  return <Acceso modo="login" />;
}

export function Registro() {
  return <Acceso modo="registro" />;
}
