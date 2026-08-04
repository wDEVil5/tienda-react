import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCuenta } from "../context/CuentaContext.jsx";
import styles from "./DatosCuenta.module.css";

const crearPerfilEditable = (cliente) => ({
  nombre: cliente?.nombre ?? "",
  telefono: cliente?.telefono ?? "",
});

// Esta vista solo permite editar los campos respaldados por PATCH /cuenta/perfil.
// Email y seguridad se mantienen fuera para no mezclar credenciales con perfil.
function DatosCuenta() {
  const { cliente, cerrarSesion, actualizarPerfil } = useCuenta();
  const navegar = useNavigate();
  const [perfil, setPerfil] = useState(() => crearPerfilEditable(cliente));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const tieneCambios =
    perfil.nombre.trim() !== (cliente?.nombre ?? "") ||
    perfil.telefono.trim() !== (cliente?.telefono ?? "");

  const manejarCerrarSesion = async () => {
    await cerrarSesion();
    navegar("/", { replace: true });
  };

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

  return (
    <section className={styles.pantalla} aria-labelledby="titulo-datos-cuenta">
      <header className={styles.cabecera}>
        <Link to="/" className={styles.logo}>
          Sumarket<em>Express</em>
        </Link>
        <div className={styles.sesionActual}>
          <span>{cliente?.nombre}</span>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={manejarCerrarSesion}>Salir</button>
        </div>
      </header>

      <div className={styles.cuerpo}>
        <aside className={styles.navegacion} aria-label="Secciones de mi cuenta">
          <Link to="/mi-cuenta">Resumen</Link>
          <Link to="/mi-cuenta/pedidos">Mis pedidos</Link>
          <Link to="/mi-cuenta#direcciones">Direcciones</Link>
          <span className={styles.navActiva} aria-current="page">Datos y seguridad</span>
        </aside>

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
                <button type="button" disabled>Cambiar contraseña</button>
              </div>
              <div className={styles.ajuste}>
                <div>
                  <strong>Sesiones activas</strong>
                  <p>Podrás cerrar las sesiones abiertas en otros dispositivos.</p>
                </div>
                <button type="button" disabled>Cerrar sesiones</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  );
}

export default DatosCuenta;
