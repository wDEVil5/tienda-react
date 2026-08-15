import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  actualizarBannerAdmin,
  crearBannerAdmin,
  eliminarBannerAdmin,
  listarBannersAdmin,
  obtenerSesionAdmin,
  subirImagenBannerAdmin,
} from "../services/adminApi.js";
import styles from "./AdminBanners.module.css";

// datetime-local trabaja en hora local y sin zona; convertimos el ISO del backend
// a "YYYY-MM-DDTHH:mm" para precargar el campo. Vacío → "".
function aValorLocal(iso) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const dosDigitos = (numero) => String(numero).padStart(2, "0");
  return (
    `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
    `T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  );
}

// Etiqueta de estado que ve el admin: refleja la MISMA lógica de vigencia del
// backend (activo + ventana empiezaEn/terminaEn) para no llevarse sorpresas.
function estadoBanner(banner, ahora = Date.now()) {
  if (!banner.activo) return { texto: "Inactivo", clase: styles.badgeInactivo };
  if (banner.empiezaEn && new Date(banner.empiezaEn).getTime() > ahora) {
    return { texto: "Programado", clase: styles.badgeProgramado };
  }
  if (banner.terminaEn && new Date(banner.terminaEn).getTime() <= ahora) {
    return { texto: "Vencido", clase: styles.badgeVencido };
  }
  return { texto: "Visible", clase: styles.badgeVisible };
}

function EditorBanner({ banner, onGuardado, onEliminado }) {
  const esNuevo = banner === null;
  const [titulo, setTitulo] = useState(banner?.titulo ?? "");
  const [imagenUrl, setImagenUrl] = useState(banner?.imagenUrl ?? "");
  const [storageKey, setStorageKey] = useState(banner?.storageKey ?? null);
  const [enlace, setEnlace] = useState(banner?.enlace ?? "");
  const [orden, setOrden] = useState(String(banner?.orden ?? 0));
  const [activo, setActivo] = useState(banner?.activo ?? true);
  const [empiezaEn, setEmpiezaEn] = useState(aValorLocal(banner?.empiezaEn));
  const [terminaEn, setTerminaEn] = useState(aValorLocal(banner?.terminaEn));

  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function elegirImagen(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = ""; // permite re-seleccionar el mismo archivo
    if (!archivo) return;

    setSubiendo(true);
    setMensaje(null);
    try {
      const imagen = await subirImagenBannerAdmin(archivo);
      setImagenUrl(imagen.url);
      setStorageKey(imagen.storageKey);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error instanceof ErrorAdminApi ? error.message : "No pudimos subir la imagen.",
      });
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (titulo.trim().length < 2) {
      setMensaje({ tipo: "error", texto: "El título necesita al menos 2 caracteres." });
      return;
    }
    if (!imagenUrl) {
      setMensaje({ tipo: "error", texto: "Sube una imagen para el banner." });
      return;
    }

    // "" en enlace/fechas los normaliza el backend a null; el orden va como número.
    const cuerpo = {
      titulo: titulo.trim(),
      imagenUrl,
      storageKey,
      enlace,
      orden: Number(orden) || 0,
      activo,
      empiezaEn,
      terminaEn,
    };

    setGuardando(true);
    setMensaje(null);
    try {
      const guardado = esNuevo
        ? await crearBannerAdmin(cuerpo)
        : await actualizarBannerAdmin(banner.id, cuerpo);
      onGuardado(guardado, esNuevo);
      setMensaje({ tipo: "ok", texto: "Banner guardado." });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error instanceof ErrorAdminApi ? error.message : "No pudimos guardar el banner.",
      });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (esNuevo) return;
    if (!window.confirm(`¿Eliminar el banner “${banner.titulo}”? También se borra su imagen.`)) return;

    setEliminando(true);
    setMensaje(null);
    try {
      await eliminarBannerAdmin(banner.id);
      onEliminado(banner.id);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error instanceof ErrorAdminApi ? error.message : "No pudimos eliminar el banner.",
      });
      setEliminando(false);
    }
  }

  return (
    <form className={styles.editor} onSubmit={guardar}>
      <div className={styles.imagenBloque}>
        <div className={styles.previaImagen}>
          {imagenUrl ? (
            <img src={imagenUrl} alt="Vista previa del banner" />
          ) : (
            <span className={styles.previaVacia}>Sin imagen</span>
          )}
        </div>
        <label className={styles.subir}>
          <input type="file" accept="image/*" onChange={elegirImagen} disabled={subiendo} />
          <span>{subiendo ? "Subiendo…" : imagenUrl ? "Cambiar imagen" : "Subir imagen"}</span>
        </label>
        <p className={styles.ayuda}>Horizontal, mínimo 1000px de ancho. JPG/PNG hasta 5 MB.</p>
      </div>

      <label className={styles.campo}>
        <span>Título</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} placeholder="Ej. Ofertas de la semana" />
      </label>

      <label className={styles.campo}>
        <span>Enlace (opcional)</span>
        <input
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="/#catalogo o https://…"
        />
      </label>

      <div className={styles.fila2}>
        <label className={styles.campo}>
          <span>Orden</span>
          <input type="number" min={0} max={9999} value={orden} onChange={(e) => setOrden(e.target.value)} />
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span>Activo</span>
        </label>
      </div>

      <fieldset className={styles.vigencia}>
        <legend>Vigencia (opcional)</legend>
        <div className={styles.fila2}>
          <label className={styles.campo}>
            <span>Empieza</span>
            <input type="datetime-local" value={empiezaEn} onChange={(e) => setEmpiezaEn(e.target.value)} />
          </label>
          <label className={styles.campo}>
            <span>Termina</span>
            <input type="datetime-local" value={terminaEn} onChange={(e) => setTerminaEn(e.target.value)} />
          </label>
        </div>
        <p className={styles.ayuda}>Déjalas vacías para mostrarlo siempre mientras esté activo.</p>
      </fieldset>

      <div className={styles.barraGuardar}>
        {!esNuevo && (
          <button type="button" className={styles.botonEliminar} onClick={eliminar} disabled={eliminando}>
            {eliminando ? "Eliminando…" : "Eliminar"}
          </button>
        )}
        <div className={styles.barraDerecha}>
          <span className={mensaje?.tipo === "error" ? styles.mensajeError : styles.mensajeOk} role="status" aria-live="polite">
            {mensaje?.texto}
          </span>
          <button type="submit" className={styles.botonGuardar} disabled={guardando || subiendo}>
            {guardando ? "Guardando…" : esNuevo ? "Crear banner" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function AdminBanners() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [reintentoAcceso, setReintentoAcceso] = useState(0);
  const [banners, setBanners] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);
  const [seleccion, setSeleccion] = useState(null); // id existente | "nuevo" | null
  const esAdmin = usuario?.rol === "ADMIN";

  useEffect(() => {
    let vigente = true;
    obtenerSesionAdmin()
      .then((sesion) => {
        if (!vigente) return;
        setUsuario(sesion);
        setErrorAcceso(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        setUsuario(null);
        setErrorAcceso(errorRespuesta instanceof ErrorAdminApi ? errorRespuesta.message : "No pudimos comprobar el acceso al panel.");
      });
    return () => { vigente = false; };
  }, [reintentoAcceso]);

  useEffect(() => {
    if (!usuario || !esAdmin) return undefined;
    let vigente = true;
    listarBannersAdmin()
      .then((lista) => {
        if (!vigente) return;
        setBanners(Array.isArray(lista) ? lista : []);
        setError(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setError(errorRespuesta.message ?? "No pudimos cargar los banners.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [usuario, esAdmin, reintento]);

  function ordenarBanners(lista) {
    return [...lista].sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, "es"));
  }

  function alGuardar(guardado, esNuevo) {
    setBanners((actuales) =>
      ordenarBanners(
        esNuevo
          ? [...actuales, guardado]
          : actuales.map((banner) => (banner.id === guardado.id ? guardado : banner)),
      ),
    );
    setSeleccion(guardado.id);
  }

  function alEliminar(id) {
    setBanners((actuales) => actuales.filter((banner) => banner.id !== id));
    setSeleccion(null);
  }

  const bannerSeleccionado = seleccion && seleccion !== "nuevo"
    ? banners.find((banner) => banner.id === seleccion) ?? null
    : null;

  if (usuario === undefined) return <main className={styles.acceso}><p role="status">Comprobando acceso al panel…</p></main>;
  if (!usuario) {
    if (!errorAcceso) return <Navigate to="/admin/acceso" replace />;
    return (
      <main className={styles.acceso}>
        <section className={styles.accesoCaja} role="alert">
          <h1>No pudimos conectar</h1><p>{errorAcceso}</p>
          <button type="button" onClick={() => { setUsuario(undefined); setErrorAcceso(null); setReintentoAcceso((v) => v + 1); }}>Reintentar</button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Banners">
        <header className={styles.cabecera}>
          <div>
            <h1>Banners</h1>
            <p className={styles.subtitulo}>Carrusel principal de la portada.</p>
          </div>
          {esAdmin && (
            <button type="button" className={styles.botonNuevo} onClick={() => setSeleccion("nuevo")}>
              + Nuevo banner
            </button>
          )}
        </header>

        {!esAdmin ? (
          <p className={styles.soloAdmin}>Esta sección es solo para administradores.</p>
        ) : (
          <div className={styles.cuerpo}>
            <aside className={styles.lista}>
              {cargando ? (
                <p className={styles.estadoLista} role="status">Cargando banners…</p>
              ) : error ? (
                <div className={styles.estadoLista} role="alert">
                  <strong>No pudimos cargar los banners.</strong>
                  <span>{error}</span>
                  <button type="button" onClick={() => { setCargando(true); setReintento((v) => v + 1); }}>Reintentar</button>
                </div>
              ) : banners.length === 0 ? (
                <p className={styles.estadoLista}>Aún no hay banners. Crea el primero con “+ Nuevo banner”.</p>
              ) : (
                banners.map((banner) => {
                  const estado = estadoBanner(banner);
                  return (
                    <button
                      key={banner.id}
                      type="button"
                      className={`${styles.fila} ${seleccion === banner.id ? styles.filaActiva : ""}`}
                      onClick={() => setSeleccion(banner.id)}
                    >
                      <span className={styles.filaMiniatura}>
                        <img src={banner.imagenUrl} alt="" />
                      </span>
                      <span className={styles.filaInfo}>
                        <span className={styles.filaTitulo}>{banner.titulo}</span>
                        <span className={styles.filaOrden}>Orden {banner.orden}</span>
                      </span>
                      <span className={`${styles.badge} ${estado.clase}`}>{estado.texto}</span>
                    </button>
                  );
                })
              )}
            </aside>

            <section className={styles.panel}>
              {seleccion === "nuevo" ? (
                <EditorBanner key="nuevo" banner={null} onGuardado={alGuardar} onEliminado={alEliminar} />
              ) : bannerSeleccionado ? (
                <EditorBanner key={bannerSeleccionado.id} banner={bannerSeleccionado} onGuardado={alGuardar} onEliminado={alEliminar} />
              ) : (
                <p className={styles.panelVacio}>Elige un banner de la lista o crea uno nuevo.</p>
              )}
            </section>
          </div>
        )}
      </AdminShell>
    </main>
  );
}
