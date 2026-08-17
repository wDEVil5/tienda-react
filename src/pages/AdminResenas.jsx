import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import Estrellas from "../components/Estrellas.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import {
  ErrorAdminApi,
  eliminarResenaAdmin,
  listarResenasAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminResenas.module.css";

const LIMITE = 20;
const FECHA = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" });

function AdminResenas() {
  const confirmar = useConfirm();
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [resenas, setResenas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const [borrandoId, setBorrandoId] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerSesionAdmin()
      .then((sesion) => {
        if (vigente) {
          setErrorAcceso(null);
          setUsuario(sesion);
        }
      })
      .catch((errorSesion) => {
        if (vigente) {
          setErrorAcceso(
            errorSesion instanceof ErrorAdminApi ? errorSesion.message : "No pudimos comprobar el acceso al panel.",
          );
          setUsuario(null);
        }
      });
    return () => {
      vigente = false;
    };
  }, [intentoAcceso]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;
    listarResenasAdmin({ page, limit: LIMITE })
      .then((respuesta) => {
        if (!vigente) return;
        setResenas(respuesta.data ?? []);
        setMeta(respuesta.meta ?? null);
        setError(null);
      })
      .catch((errorSolicitud) => {
        if (!vigente) return;
        if (errorSolicitud instanceof ErrorAdminApi && errorSolicitud.status === 401) {
          setUsuario(null);
          return;
        }
        setError(errorSolicitud.message || "No pudimos cargar las reseñas.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [usuario, page, intento]);

  const eliminar = async (resena) => {
    const ok = await confirmar({
      titulo: "Eliminar reseña",
      mensaje: `¿Eliminar la reseña de ${resena.autor}${resena.producto ? ` sobre "${resena.producto.nombre}"` : ""}? Esta acción no se puede deshacer.`,
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    setBorrandoId(resena.id);
    try {
      await eliminarResenaAdmin(resena.id);
      // Recarga la página actual (o retrocede si quedó vacía).
      setResenas((actuales) => actuales.filter((item) => item.id !== resena.id));
      setIntento((valor) => valor + 1);
    } catch (errorSolicitud) {
      setError(errorSolicitud.message || "No pudimos eliminar la reseña.");
    } finally {
      setBorrandoId(null);
    }
  };

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

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <AdminShell usuario={usuario} seccion="Reseñas">
      <div className={styles.contenido}>
        <header className={styles.cabecera}>
          <h1>Reseñas</h1>
          <span className={styles.total}>{total} en total</span>
        </header>

        {error && <p className={styles.error} role="alert">{error}</p>}

        {cargando ? (
          <p className={styles.estado} role="status">Cargando reseñas…</p>
        ) : resenas.length === 0 ? (
          <p className={styles.vacio}>Todavía no hay reseñas de clientes.</p>
        ) : (
          <ul className={styles.lista}>
            {resenas.map((resena) => (
              <li key={resena.id} className={styles.fila}>
                <div className={styles.filaInfo}>
                  <div className={styles.filaCabecera}>
                    <Estrellas valor={resena.calificacion} tamano={14} />
                    {resena.titulo && <span className={styles.filaTitulo}>{resena.titulo}</span>}
                  </div>
                  <p className={styles.filaMeta}>
                    {resena.producto ? (
                      <a href={`${import.meta.env.BASE_URL}producto/${resena.producto.slug}`} className={styles.enlaceProducto}>
                        {resena.producto.nombre}
                      </a>
                    ) : (
                      <span>Producto eliminado</span>
                    )}
                    <span aria-hidden="true"> · </span>
                    {resena.autor}
                    <span aria-hidden="true"> · </span>
                    {FECHA.format(new Date(resena.createdAt))}
                  </p>
                  {resena.cuerpo && <p className={styles.filaCuerpo}>{resena.cuerpo}</p>}
                </div>
                <button
                  type="button"
                  className={styles.borrar}
                  onClick={() => eliminar(resena)}
                  disabled={borrandoId === resena.id}
                >
                  {borrandoId === resena.id ? "Eliminando…" : "Eliminar"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className={styles.paginacion} aria-label="Páginas de reseñas">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </button>
            <span>Página {page} de {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Siguiente
            </button>
          </nav>
        )}
      </div>
    </AdminShell>
  );
}

export default AdminResenas;
