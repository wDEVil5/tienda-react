import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Estrellas from "./Estrellas.jsx";
import { useCuenta } from "../context/CuentaContext.jsx";
import {
  eliminarResena,
  guardarResena,
  obtenerMiResena,
  obtenerResenas,
} from "../services/resenasApi.js";
import styles from "./ResenasProducto.module.css";

const ORDENES = [
  { valor: "reciente", etiqueta: "Más reciente" },
  { valor: "mejor", etiqueta: "Mejor calificadas" },
  { valor: "peor", etiqueta: "Peor calificadas" },
];

const LIMITE = 5;

function formatearFecha(fecha) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.valueOf())) return "";
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric" }).format(valor);
}

// Selector de estrellas (input) para el formulario.
function EntradaEstrellas({ valor, onCambiar }) {
  const [hover, setHover] = useState(0);
  return (
    <div className={styles.entradaEstrellas} role="radiogroup" aria-label="Tu calificación">
      {[1, 2, 3, 4, 5].map((posicion) => {
        const activa = (hover || valor) >= posicion;
        return (
          <button
            type="button"
            key={posicion}
            className={styles.estrellaBoton}
            role="radio"
            aria-checked={valor === posicion}
            aria-label={`${posicion} ${posicion === 1 ? "estrella" : "estrellas"}`}
            onMouseEnter={() => setHover(posicion)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onCambiar(posicion)}
          >
            <i className={`${activa ? "fa-solid" : "fa-regular"} fa-star`} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function ResenasProducto({ productoId }) {
  const { estaAutenticado } = useCuenta();
  const navegar = useNavigate();

  const [resenas, setResenas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [orden, setOrden] = useState("reciente");
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Elegibilidad + reseña propia del cliente.
  const [mi, setMi] = useState({ puedeResenar: false, resena: null });

  // Formulario.
  const [formAbierto, setFormAbierto] = useState(false);
  const [calificacion, setCalificacion] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  // Al cambiar de producto, la ficha remonta este componente con key={producto.id},
  // así todo el estado (página, orden, formulario) vuelve a su valor inicial sin
  // un efecto de reset.
  useEffect(() => {
    if (!productoId) return undefined;
    let vigente = true;
    obtenerResenas({ productoId, page, orden, limit: LIMITE })
      .then((respuesta) => {
        if (!vigente) return;
        setResenas(respuesta.data);
        setMeta(respuesta.meta);
        setError("");
      })
      .catch((errorSolicitud) => {
        if (vigente) setError(errorSolicitud.message || "No pudimos cargar las reseñas.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [productoId, page, orden]);

  useEffect(() => {
    if (!productoId) return undefined;
    let vigente = true;
    const cargar = estaAutenticado
      ? obtenerMiResena({ productoId })
      : Promise.resolve({ puedeResenar: false, resena: null });
    cargar
      .then((estado) => {
        if (vigente) setMi(estado);
      })
      .catch(() => {
        // Un fallo al consultar elegibilidad no rompe la lista pública.
      });
    return () => {
      vigente = false;
    };
  }, [productoId, estaAutenticado]);

  const abrirFormulario = () => {
    if (!estaAutenticado) {
      navegar("/login");
      return;
    }
    // Prefill con la reseña existente (edición) o vacío (nueva).
    setCalificacion(mi.resena?.calificacion ?? 0);
    setTitulo(mi.resena?.titulo ?? "");
    setCuerpo(mi.resena?.cuerpo ?? "");
    setErrorForm("");
    setFormAbierto(true);
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    if (guardando) return;
    if (calificacion < 1) {
      setErrorForm("Elige una calificación de 1 a 5 estrellas.");
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      await guardarResena({
        productoId,
        calificacion,
        titulo: titulo.trim() || null,
        cuerpo: cuerpo.trim() || null,
      });
      setFormAbierto(false);
      // Recarga lista (desde la primera página) y estado propio.
      setPage(1);
      const [lista, estado] = await Promise.all([
        obtenerResenas({ productoId, page: 1, orden, limit: LIMITE }),
        obtenerMiResena({ productoId }),
      ]);
      setResenas(lista.data);
      setMeta(lista.meta);
      setMi(estado);
    } catch (errorSolicitud) {
      setErrorForm(errorSolicitud.message || "No pudimos guardar tu reseña.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMia = async () => {
    if (!mi.resena) return;
    try {
      await eliminarResena({ id: mi.resena.id });
      const [lista, estado] = await Promise.all([
        obtenerResenas({ productoId, page: 1, orden, limit: LIMITE }),
        obtenerMiResena({ productoId }),
      ]);
      setPage(1);
      setResenas(lista.data);
      setMeta(lista.meta);
      setMi(estado);
      setFormAbierto(false);
    } catch (errorSolicitud) {
      setErrorForm(errorSolicitud.message || "No pudimos eliminar tu reseña.");
    }
  };

  const promedio = meta?.promedio ?? null;
  const conteo = meta?.conteo ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <section className={styles.seccion} aria-labelledby="titulo-resenas">
      <div className={styles.tituloLinea}>
        <h2 id="titulo-resenas" className={styles.titulo}>Reseñas y Calificaciones</h2>
      </div>

      <div className={styles.resumen}>
        <div className={styles.promedioCaja}>
          <Estrellas valor={promedio ?? 0} tamano={16} />
          <span className={styles.promedioNumero}>{promedio !== null ? promedio.toFixed(1) : "—"}</span>
        </div>
        <button type="button" className={styles.botonCalificar} onClick={abrirFormulario}>
          {mi.resena ? "Editar mi reseña" : "Calificar producto"}
        </button>
      </div>

      <div className={styles.barra}>
        <span className={styles.conteo}>
          {conteo} {conteo === 1 ? "calificación" : "calificaciones"}
        </span>
        <label className={styles.ordenar}>
          <span>Ordenar por</span>
          <select
            value={orden}
            onChange={(evento) => {
              setPage(1);
              setOrden(evento.target.value);
            }}
          >
            {ORDENES.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </label>
      </div>

      {formAbierto && (
        <form className={styles.formulario} onSubmit={enviar}>
          {mi.puedeResenar ? (
            <>
              <div className={styles.campo}>
                <span className={styles.etiquetaCampo}>Tu calificación</span>
                <EntradaEstrellas valor={calificacion} onCambiar={setCalificacion} />
              </div>
              <div className={styles.campo}>
                <label className={styles.etiquetaCampo} htmlFor="resena-titulo">Título (opcional)</label>
                <input
                  id="resena-titulo"
                  type="text"
                  maxLength={120}
                  value={titulo}
                  onChange={(evento) => setTitulo(evento.target.value)}
                  placeholder="Resume tu experiencia"
                />
              </div>
              <div className={styles.campo}>
                <label className={styles.etiquetaCampo} htmlFor="resena-cuerpo">Comentario (opcional)</label>
                <textarea
                  id="resena-cuerpo"
                  rows={4}
                  maxLength={1000}
                  value={cuerpo}
                  onChange={(evento) => setCuerpo(evento.target.value)}
                  placeholder="Cuéntanos qué te pareció"
                />
              </div>
              {errorForm && <p className={styles.errorForm} role="alert">{errorForm}</p>}
              <div className={styles.accionesForm}>
                <button type="submit" className={styles.enviar} disabled={guardando}>
                  {guardando ? "Guardando…" : mi.resena ? "Guardar cambios" : "Publicar reseña"}
                </button>
                {mi.resena && (
                  <button type="button" className={styles.eliminar} onClick={eliminarMia} disabled={guardando}>
                    Eliminar
                  </button>
                )}
                <button type="button" className={styles.cancelar} onClick={() => setFormAbierto(false)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <p className={styles.avisoCompra}>
              Solo quienes compraron este producto pueden calificarlo. Cuando recibas un pedido
              con este producto, podrás dejar tu reseña aquí.
            </p>
          )}
        </form>
      )}

      {error ? (
        <p className={styles.estado} role="alert">{error}</p>
      ) : cargando ? (
        <p className={styles.estado}>Cargando reseñas…</p>
      ) : resenas.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay reseñas. ¡Sé el primero en calificar!</p>
      ) : (
        <ul className={styles.lista}>
          {resenas.map((resena) => (
            <li key={resena.id} className={styles.resena}>
              <div className={styles.resenaCabecera}>
                <Estrellas valor={resena.calificacion} tamano={14} />
                {resena.titulo && <span className={styles.resenaTitulo}>{resena.titulo}</span>}
                {resena.esMia && <span className={styles.badgeMia}>Tu reseña</span>}
              </div>
              <p className={styles.resenaFecha}>{formatearFecha(resena.createdAt)}</p>
              <p className={styles.resenaAutor}>
                {resena.autor} <span className={styles.verificada}><i className="fa-solid fa-circle-check" aria-hidden="true" /> Compra verificada</span>
              </p>
              {resena.cuerpo && <p className={styles.resenaCuerpo}>{resena.cuerpo}</p>}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className={styles.paginacion} aria-label="Páginas de reseñas">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Anterior">
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
          </button>
          {Array.from({ length: totalPages }, (_, indice) => indice + 1).map((numero) => (
            <button
              type="button"
              key={numero}
              className={numero === page ? styles.paginaActiva : ""}
              aria-current={numero === page ? "page" : undefined}
              onClick={() => setPage(numero)}
            >
              {numero}
            </button>
          ))}
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Siguiente">
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  );
}

export default ResenasProducto;
