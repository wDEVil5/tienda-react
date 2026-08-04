import { Link, useNavigate } from "react-router-dom";
import { useCuenta } from "../context/CuentaContext.jsx";
import styles from "./DatosCuenta.module.css";

// Esta vista consume el perfil público de la sesión. Los campos permanecen en
// solo lectura hasta contar con un endpoint que valide y persista cada cambio.
function DatosCuenta() {
  const { cliente, cerrarSesion } = useCuenta();
  const navegar = useNavigate();

  const manejarCerrarSesion = async () => {
    await cerrarSesion();
    navegar("/", { replace: true });
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
              <span className={styles.estadoPendiente}>Edición próximamente</span>
            </div>

            <form className={styles.formulario} aria-describedby="aviso-edicion">
              <div className={styles.campo}>
                <label htmlFor="nombre-cuenta">Nombre completo</label>
                <input id="nombre-cuenta" value={cliente?.nombre ?? ""} readOnly />
              </div>
              <div className={styles.campo}>
                <label htmlFor="email-cuenta">Email</label>
                <input id="email-cuenta" type="email" value={cliente?.email ?? ""} readOnly />
                <small>Lo usas para entrar y recibir comunicaciones de tu pedido.</small>
              </div>
              <div className={styles.campo}>
                <label htmlFor="telefono-cuenta">Teléfono</label>
                <input id="telefono-cuenta" type="tel" value={cliente?.telefono ?? "No informado"} readOnly />
              </div>

              <div id="aviso-edicion" className={styles.aviso}>
                <span className={styles.iconoAviso} aria-hidden="true"><i className="fa-solid fa-lock" /></span>
                <p>La edición se habilitará cuando la API valide los cambios de forma segura. Por ahora tus datos se muestran tal como están guardados.</p>
              </div>

              <div className={styles.acciones}>
                <Link to="/mi-cuenta">Volver al resumen</Link>
                <button type="button" disabled title="La edición de perfil aún no está disponible">
                  Guardar cambios
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
