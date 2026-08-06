import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorCuentaApi } from "../services/cuentaApi.js";
import { useCuenta } from "../context/CuentaContext.jsx";
import { useCarritoContext } from "../context/CarritoContext.jsx";
import BotonGoogle from "../components/BotonGoogle.jsx";
import styles from "./Acceso.module.css";

const ESTADO_INICIAL_LOGIN = { email: "", contrasena: "" };
const ESTADO_INICIAL_REGISTRO = {
  nombre: "",
  apellido: "",
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
  if (error.code === "INVALID_GOOGLE_TOKEN") {
    return "No pudimos validar tu cuenta de Google. Inténtalo de nuevo.";
  }
  if (error.code === "GOOGLE_EMAIL_UNVERIFIED") {
    return "Tu correo de Google no está verificado.";
  }
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
  const { iniciarSesion, registrar, iniciarConGoogle, estaAutenticado } = useCuenta();
  const { totalItems } = useCarritoContext();
  const [datos, setDatos] = useState(
    esRegistro ? ESTADO_INICIAL_REGISTRO : ESTADO_INICIAL_LOGIN,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState({});
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Puede ser una ubicación completa (pathname, search y hash), no solo una
  // URL de texto. Así una ruta protegida devuelve exactamente al mismo lugar.
  const destino = ubicacion.state?.desde ?? "/";

  // No dejamos una pantalla de acceso abierta después de una sesión ya válida.
  if (estaAutenticado) {
    return <Navigate to={destino} replace />;
  }

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setDatos((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
    if (error) setError(null);
  };

  function validarRegistro() {
    const siguientesErrores = {};
    if (datos.nombre.trim().length < 2) siguientesErrores.nombre = "Ingresa tu nombre.";
    if (datos.apellido.trim().length < 2) siguientesErrores.apellido = "Ingresa tu apellido.";
    if (!/^\S+@\S+\.\S+$/.test(datos.email.trim())) {
      siguientesErrores.email = "Falta el dominio: ¿wilnes@correo.cl?";
    }
    if (datos.contrasena.length < 12) {
      siguientesErrores.contrasena = "La contraseña debe tener al menos 12 caracteres.";
    }
    if (!aceptaTerminos) siguientesErrores.terminos = "Debes aceptar los términos para crear tu cuenta.";
    return siguientesErrores;
  }

  async function enviarFormulario(evento) {
    evento.preventDefault();
    if (esRegistro) {
      const siguientesErrores = validarRegistro();
      setErrores(siguientesErrores);
      if (Object.keys(siguientesErrores).length > 0) return;
    }
    setEnviando(true);
    setError(null);

    try {
      if (esRegistro) {
        await registrar({
          nombre: `${datos.nombre.trim()} ${datos.apellido.trim()}`,
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

  // Recibe el ID token que entrega Google y lo canjea por una sesión en el
  // backend. La misma pantalla sirve para login y registro: si la cuenta no
  // existe, el backend la crea (solo-Google); si existe, la fusiona por email.
  async function entrarConGoogle(idToken) {
    setError(null);
    try {
      await iniciarConGoogle(idToken);
      navegar(destino, { replace: true });
    } catch (errorRespuesta) {
      setError(mensajeDeError(errorRespuesta, esRegistro));
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
            ? "Toma menos de un minuto."
            : "Tus pedidos, direcciones y pagos en un solo lugar."}
        </p>

        <form className={styles.formulario} onSubmit={enviarFormulario} noValidate>
          {esRegistro && (
            <div className={styles.filaNombre}>
              <Campo
                id="nombre"
                etiqueta="Nombre"
                error={errores.nombre}
                type="text"
                autoComplete="given-name"
                value={datos.nombre}
                onChange={cambiar("nombre")}
                minLength="2"
                maxLength="60"
                required
              />
              <Campo
                id="apellido"
                etiqueta="Apellido"
                error={errores.apellido}
                type="text"
                autoComplete="family-name"
                value={datos.apellido}
                onChange={cambiar("apellido")}
                minLength="2"
                maxLength="60"
                required
              />
            </div>
          )}
          <Campo
            id="email"
            etiqueta="Email"
            error={errores.email}
            type="email"
            autoComplete="email"
            value={datos.email}
            onChange={cambiar("email")}
            maxLength="255"
            required
          />
          {errores.email && <p className={styles.errorCampo}>{errores.email}</p>}
          {esRegistro && (
            <Campo
              id="telefono"
              etiqueta="Teléfono"
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
                className={errores.contrasena ? styles.inputError : styles.input}
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
            <>
              <div className={styles.fuerzaContrasena} aria-label="Fortaleza de contraseña">
                {[0, 1, 2, 3].map((segmento) => (
                  <span
                    key={segmento}
                    className={segmento < calcularFuerza(datos.contrasena) ? styles.fuerzaActiva : ""}
                  ></span>
                ))}
              </div>
              <p className={styles.ayuda}>{textoFuerza(datos.contrasena)}</p>
              {errores.contrasena && <p className={styles.errorCampo}>{errores.contrasena}</p>}
              <label className={styles.terminos}>
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={(evento) => {
                    setAceptaTerminos(evento.target.checked);
                    setErrores((previos) => ({ ...previos, terminos: undefined }));
                  }}
                />
                <span>Acepto los términos de servicio y la política de privacidad.</span>
              </label>
              {errores.terminos && <p className={styles.errorCampo}>{errores.terminos}</p>}
            </>
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
              <Link className={styles.olvide} to="/recuperar-contrasena">
                Olvidé mi contraseña
              </Link>
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

        <div className={styles.separador} aria-hidden="true"><span></span>o<span></span></div>
        <BotonGoogle
          onCredencial={entrarConGoogle}
          texto={esRegistro ? "signup_with" : "continue_with"}
        />
        <p className={styles.notaGoogle}>
          Con Google no necesitas contraseña · usamos solo tu nombre y correo.
        </p>

        {!esRegistro && (
          <div className={styles.alternativa}>
            <span>¿Primera vez por aquí?</span>
            <Link to="/registro" state={ubicacion.state}>Crear cuenta</Link>
          </div>
        )}

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

function calcularFuerza(contrasena) {
  if (!contrasena) return 0;
  return [contrasena.length >= 12, /[A-Z]/.test(contrasena), /\d/.test(contrasena), /[^A-Za-z0-9]/.test(contrasena)]
    .filter(Boolean)
    .length;
}

function textoFuerza(contrasena) {
  const fuerza = calcularFuerza(contrasena);
  if (fuerza >= 3) return "Buena · 12 caracteres, mayúscula y número";
  if (contrasena.length >= 12) return "Agrega una mayúscula y un número para reforzarla.";
  return "Mínimo 12 caracteres.";
}

export function Login() {
  return <Acceso modo="login" />;
}

export function Registro() {
  return <Acceso modo="registro" />;
}
