import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import Markdown from "../components/Markdown.jsx";
import {
  ErrorAdminApi,
  guardarPaginaAdmin,
  listarPaginasAdmin,
  obtenerPaginaAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminContenido.module.css";

function estadoPagina(pagina) {
  if (pagina.publicada) return { texto: "Publicada", clase: styles.badgePublicada };
  if (pagina.existe) return { texto: "Borrador", clase: styles.badgeBorrador };
  return { texto: "Sin crear", clase: styles.badgeSinCrear };
}

// Editor de una página: título, cuerpo Markdown (con pestañas Escribir/Vista
// previa) y el interruptor de publicación. Guarda con PUT (upsert).
function EditorPagina({ pagina, onGuardado }) {
  const [titulo, setTitulo] = useState(pagina.titulo);
  const [cuerpo, setCuerpo] = useState(pagina.cuerpo);
  const [publicada, setPublicada] = useState(pagina.publicada);
  const [pestana, setPestana] = useState("escribir"); // "escribir" | "previa"
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // No hay efecto para "sincronizar" el form con la página: el componente se
  // remonta con key={slug} al cambiar de página (ver donde se renderiza), así los
  // useState toman el contenido nuevo como valor inicial. Más simple y sin efecto.

  async function guardar(evento) {
    evento.preventDefault();
    setMensaje(null);

    const tituloLimpio = titulo.trim();
    if (tituloLimpio.length < 2 || tituloLimpio.length > 160) {
      setMensaje({ tipo: "error", texto: "El título debe tener entre 2 y 160 caracteres." });
      return;
    }
    if (cuerpo.length > 50000) {
      setMensaje({ tipo: "error", texto: "El contenido es demasiado largo (máx. 50.000 caracteres)." });
      return;
    }

    setGuardando(true);
    try {
      const guardada = await guardarPaginaAdmin(pagina.slug, {
        titulo: tituloLimpio,
        cuerpo,
        publicada,
      });
      setMensaje({ tipo: "ok", texto: "Página guardada." });
      onGuardado(guardada);
    } catch (errorRespuesta) {
      setMensaje({
        tipo: "error",
        texto:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos guardar la página.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className={styles.editor} onSubmit={guardar}>
      <label className={styles.campo}>
        <span>Título</span>
        <input
          type="text"
          maxLength={160}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </label>

      <div className={styles.editorCabecera}>
        <div className={styles.pestanas} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === "escribir"}
            className={pestana === "escribir" ? styles.pestanaActiva : styles.pestana}
            onClick={() => setPestana("escribir")}
          >
            Escribir
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === "previa"}
            className={pestana === "previa" ? styles.pestanaActiva : styles.pestana}
            onClick={() => setPestana("previa")}
          >
            Vista previa
          </button>
        </div>
        <span className={styles.ayudaMd}>Formato Markdown</span>
      </div>

      {pestana === "escribir" ? (
        <textarea
          className={styles.textarea}
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          placeholder={"# Título\n\nEscribe aquí con **Markdown**:\n\n- Listas\n- Enlaces [texto](https://…)\n\n## Subtítulo"}
          spellCheck
        />
      ) : (
        <div className={styles.previa}>
          {cuerpo.trim() ? (
            <div className={styles.prosa}>
              <Markdown>{cuerpo}</Markdown>
            </div>
          ) : (
            <p className={styles.previaVacia}>Nada que previsualizar todavía.</p>
          )}
        </div>
      )}

      <div className={styles.barraGuardar}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={publicada}
            onChange={(e) => setPublicada(e.target.checked)}
          />
          Publicada (visible en la tienda)
        </label>
        <div className={styles.barraDerecha}>
          {mensaje && (
            <span
              className={mensaje.tipo === "ok" ? styles.mensajeOk : styles.mensajeError}
              role="status"
            >
              {mensaje.texto}
            </span>
          )}
          <button type="submit" className={styles.botonGuardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function AdminContenido() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [paginas, setPaginas] = useState([]);
  const [slugSeleccionado, setSlugSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

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

    listarPaginasAdmin()
      .then((lista) => {
        if (!vigente) return;
        const data = Array.isArray(lista) ? lista : [];
        setPaginas(data);
        setSlugSeleccionado((actual) =>
          actual && data.some((p) => p.slug === actual) ? actual : data[0]?.slug ?? null,
        );
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

  useEffect(() => {
    if (!esAdmin || !slugSeleccionado) return undefined;
    let vigente = true;

    obtenerPaginaAdmin(slugSeleccionado)
      .then((data) => {
        if (vigente) setDetalle(data);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
        }
      });

    return () => {
      vigente = false;
    };
  }, [esAdmin, slugSeleccionado]);

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

  // Cuando el editor guarda, actualiza la fila de la lista (estado/título) sin
  // recargar todo, y refresca el detalle con lo guardado.
  function alGuardar(guardada) {
    setPaginas((actuales) =>
      actuales.map((p) =>
        p.slug === guardada.slug
          ? { ...p, titulo: guardada.titulo, publicada: guardada.publicada, existe: true }
          : p,
      ),
    );
    setDetalle(guardada);
  }

  const detalleListo = detalle && detalle.slug === slugSeleccionado;

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Contenido">
        <header className={styles.cabecera}>
          <div>
            <h1>Contenido</h1>
            <p className={styles.subtitulo}>Páginas informativas de la tienda (footer).</p>
          </div>
        </header>

        {!esAdmin ? (
          <p className={styles.soloAdmin}>
            Esta sección es solo para administradores.
          </p>
        ) : (
          <div className={styles.cuerpo}>
            <div className={styles.lista} aria-label="Páginas de contenido">
              {cargando ? (
                <p className={styles.estadoLista} role="status">Cargando…</p>
              ) : error ? (
                <div className={styles.estadoLista} role="alert">
                  <strong>No pudimos cargar</strong>
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCargando(true);
                      setError(null);
                      setIntento((v) => v + 1);
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                paginas.map((pagina) => {
                  const estado = estadoPagina(pagina);
                  return (
                    <button
                      key={pagina.slug}
                      type="button"
                      className={`${styles.fila} ${pagina.slug === slugSeleccionado ? styles.filaActiva : ""}`}
                      aria-current={pagina.slug === slugSeleccionado ? "true" : undefined}
                      onClick={() => setSlugSeleccionado(pagina.slug)}
                    >
                      <span className={styles.filaTitulo}>{pagina.titulo}</span>
                      <span className={styles.filaSlug}>/{pagina.slug}</span>
                      <span className={`${styles.badge} ${estado.clase}`}>{estado.texto}</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className={styles.panel}>
              {!slugSeleccionado ? (
                <p className={styles.panelVacio}>Selecciona una página para editarla.</p>
              ) : detalleListo ? (
                <EditorPagina key={detalle.slug} pagina={detalle} onGuardado={alGuardar} />
              ) : (
                <p className={styles.panelVacio} role="status">Cargando página…</p>
              )}
            </div>
          </div>
        )}
      </AdminShell>
    </main>
  );
}
