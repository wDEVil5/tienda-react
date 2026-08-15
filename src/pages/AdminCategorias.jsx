import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  actualizarSubcategoriaAdmin,
  activarCategoriaAdmin,
  crearCategoriaAdmin,
  crearSubcategoriaAdmin,
  crearSubcategoriaHijaAdmin,
  desactivarCategoriaAdmin,
  eliminarSubcategoriaAdmin,
  eliminarSubcategoriaHijaAdmin,
  listarCategoriasAdmin,
  listarSubcategoriasAdmin,
  obtenerSesionAdmin,
  actualizarSubcategoriaHijaAdmin,
} from "../services/adminApi.js";
import styles from "./AdminCategorias.module.css";

function mensajeError(error, respaldo) {
  return error instanceof ErrorAdminApi ? error.message : respaldo;
}

function ordenarPorOrden(lista) {
  return [...lista].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
}

// Tercer nivel administrable dentro de su subcategoría. Mantenerlo aquí deja
// visible la relación padre → hija y evita una pantalla separada para la taxonomía.
function GestionHijas({ subcategoria, onCambio }) {
  const [hijas, setHijas] = useState(() => subcategoria.hijas ?? []);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);

  async function crear(evento) {
    evento.preventDefault();
    if (nombre.trim().length < 2) return setError("El nombre necesita al menos 2 caracteres.");
    setCreando(true);
    setError(null);
    try {
      const nueva = await crearSubcategoriaHijaAdmin(subcategoria.id, { nombre: nombre.trim(), orden: hijas.length });
      const siguiente = ordenarPorOrden([...hijas, { ...nueva, productosAsignados: 0 }]);
      setHijas(siguiente);
      onCambio(siguiente);
      setNombre("");
    } catch (errorRespuesta) {
      setError(mensajeError(errorRespuesta, "No pudimos crear el tercer nivel."));
    } finally {
      setCreando(false);
    }
  }

  async function actualizar(hija, cambios) {
    setError(null);
    try {
      const actualizada = await actualizarSubcategoriaHijaAdmin(hija.id, cambios);
      const siguiente = ordenarPorOrden(hijas.map((item) => item.id === hija.id ? { ...item, ...actualizada } : item));
      setHijas(siguiente);
      onCambio(siguiente);
    } catch (errorRespuesta) {
      setError(mensajeError(errorRespuesta, "No pudimos guardar el tercer nivel."));
    }
  }

  async function eliminar(hija) {
    if (!window.confirm(`¿Eliminar “${hija.nombre}”?`)) return;
    setError(null);
    try {
      await eliminarSubcategoriaHijaAdmin(hija.id);
      const siguiente = hijas.filter((item) => item.id !== hija.id);
      setHijas(siguiente);
      onCambio(siguiente);
    } catch (errorRespuesta) {
      setError(mensajeError(errorRespuesta, "No pudimos eliminar el tercer nivel."));
    }
  }

  return (
    <div className={styles.hijas}>
      <p className={styles.hijasTitulo}>Tercer nivel</p>
      {hijas.map((hija) => (
        <div className={styles.hijaFila} key={hija.id}>
          <input
            type="number"
            min={0}
            aria-label={`Orden de ${hija.nombre}`}
            defaultValue={hija.orden}
            onBlur={(e) => Number(e.target.value) !== hija.orden && actualizar(hija, { orden: Number(e.target.value) || 0 })}
          />
          <input
            maxLength={100}
            aria-label={`Nombre de ${hija.nombre}`}
            defaultValue={hija.nombre}
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== hija.nombre && actualizar(hija, { nombre: e.target.value.trim() })}
          />
          <button type="button" className={hija.activa ? styles.hijaActiva : styles.hijaOculta} onClick={() => actualizar(hija, { activa: !hija.activa })}>
            {hija.activa ? "Activa" : "Oculta"}
          </button>
          <button type="button" className={styles.hijaEliminar} onClick={() => eliminar(hija)} aria-label={`Eliminar ${hija.nombre}`}>✕</button>
        </div>
      ))}
      <form className={styles.nuevaHija} onSubmit={crear}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} placeholder="Nuevo tercer nivel" aria-label="Nuevo tercer nivel" />
        <button type="submit" disabled={creando}>{creando ? "…" : "Agregar"}</button>
      </form>
      {error && <p className={styles.subError} role="alert">{error}</p>}
    </div>
  );
}

// Fila editable de una subcategoría: nombre, orden, activa; guardar / eliminar.
function FilaSubcategoria({ subcategoria, onActualizada, onEliminada }) {
  const [nombre, setNombre] = useState(subcategoria.nombre);
  const [orden, setOrden] = useState(String(subcategoria.orden));
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState(null);

  const sinCambios =
    nombre.trim() === subcategoria.nombre && Number(orden) === subcategoria.orden;

  async function guardar() {
    if (nombre.trim().length < 2) {
      setError("El nombre necesita al menos 2 caracteres.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const actualizada = await actualizarSubcategoriaAdmin(subcategoria.id, {
        nombre: nombre.trim(),
        orden: Number(orden) || 0,
      });
      onActualizada(actualizada);
    } catch (errorRespuesta) {
      setError(mensajeError(errorRespuesta, "No pudimos guardar la subcategoría."));
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActiva() {
    setError(null);
    try {
      const actualizada = await actualizarSubcategoriaAdmin(subcategoria.id, {
        activa: !subcategoria.activa,
      });
      onActualizada(actualizada);
    } catch (errorRespuesta) {
      setError(mensajeError(errorRespuesta, "No pudimos cambiar el estado."));
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar la subcategoría “${subcategoria.nombre}”?`)) return;
    setEliminando(true);
    setError(null);
    try {
      await eliminarSubcategoriaAdmin(subcategoria.id);
      onEliminada(subcategoria.id);
    } catch (errorRespuesta) {
      setError(mensajeError(errorRespuesta, "No pudimos eliminar la subcategoría."));
      setEliminando(false);
    }
  }

  function actualizarHijas(hijas) {
    onActualizada({ ...subcategoria, hijas });
  }

  return (
    <div className={styles.subBloque}>
    <div className={styles.subFila}>
      <input
        className={styles.subOrden}
        type="number"
        min={0}
        value={orden}
        onChange={(e) => setOrden(e.target.value)}
        aria-label={`Orden de ${subcategoria.nombre}`}
      />
      <input
        className={styles.subNombre}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={100}
        aria-label="Nombre de la subcategoría"
      />
      <button
        type="button"
        className={`${styles.subEstado} ${subcategoria.activa ? styles.subActiva : styles.subInactiva}`}
        onClick={alternarActiva}
        title={subcategoria.activa ? "Activa (clic para ocultar)" : "Oculta (clic para mostrar)"}
      >
        {subcategoria.activa ? "Activa" : "Oculta"}
      </button>
      <button type="button" className={styles.subGuardar} onClick={guardar} disabled={guardando || sinCambios}>
        {guardando ? "…" : "Guardar"}
      </button>
      <button type="button" className={styles.subEliminar} onClick={eliminar} disabled={eliminando} aria-label="Eliminar">
        ✕
      </button>
      {error && <span className={styles.subError} role="alert">{error}</span>}
    </div>
    <GestionHijas subcategoria={subcategoria} onCambio={actualizarHijas} />
    </div>
  );
}

function PanelSubcategorias({ categoria, onCambioConteo }) {
  const [subcategorias, setSubcategorias] = useState(null);
  const [error, setError] = useState(null);
  const [nombreNueva, setNombreNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState(null);

  // El componente se remonta con key={categoria.id} al cambiar de categoría, así
  // que el estado ya arranca limpio: el efecto solo necesita cargar los datos.
  useEffect(() => {
    let vigente = true;
    listarSubcategoriasAdmin(categoria.id)
      .then((lista) => {
        if (vigente) setSubcategorias(Array.isArray(lista) ? lista : []);
      })
      .catch((errorRespuesta) => {
        if (vigente) setError(mensajeError(errorRespuesta, "No pudimos cargar las subcategorías."));
      });
    return () => {
      vigente = false;
    };
  }, [categoria.id]);

  async function crear(evento) {
    evento.preventDefault();
    if (nombreNueva.trim().length < 2) {
      setErrorCrear("Escribe un nombre de al menos 2 caracteres.");
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const orden = subcategorias?.length ?? 0;
      const nueva = await crearSubcategoriaAdmin(categoria.id, { nombre: nombreNueva.trim(), orden });
      setSubcategorias((actuales) => ordenarPorOrden([...(actuales ?? []), { ...nueva, productosAsignados: 0, hijas: [] }]));
      onCambioConteo?.(1);
      setNombreNueva("");
    } catch (errorRespuesta) {
      setErrorCrear(mensajeError(errorRespuesta, "No pudimos crear la subcategoría."));
    } finally {
      setCreando(false);
    }
  }

  function actualizar(actualizada) {
    setSubcategorias((actuales) =>
      ordenarPorOrden((actuales ?? []).map((s) => (s.id === actualizada.id ? { ...s, ...actualizada } : s))),
    );
  }

  function eliminar(id) {
    setSubcategorias((actuales) => (actuales ?? []).filter((s) => s.id !== id));
    onCambioConteo?.(-1);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelCabecera}>
        <h2>{categoria.nombre}</h2>
        <span className={styles.panelMeta}>
          /{categoria.slug} · {categoria.productosAsignados}{" "}
          {categoria.productosAsignados === 1 ? "producto" : "productos"}
        </span>
      </div>

      <form className={styles.nuevaSub} onSubmit={crear}>
        <input
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
          maxLength={100}
          placeholder="Nueva subcategoría (ej. Café y Cafeteras)"
          aria-label="Nombre de la nueva subcategoría"
        />
        <button type="submit" disabled={creando}>
          {creando ? "Creando…" : "Agregar"}
        </button>
      </form>
      {errorCrear && <p className={styles.mensajeError} role="alert">{errorCrear}</p>}

      {subcategorias === null ? (
        <p className={styles.estado} role="status">Cargando subcategorías…</p>
      ) : error ? (
        <p className={styles.estado} role="alert">{error}</p>
      ) : subcategorias.length === 0 ? (
        <p className={styles.estado}>Aún no hay subcategorías. Crea la primera arriba.</p>
      ) : (
        <div className={styles.subLista}>
          <div className={styles.subEncabezado}>
            <span>Orden</span>
            <span>Nombre</span>
            <span />
          </div>
          {subcategorias.map((sub) => (
            <FilaSubcategoria
              key={sub.id}
              subcategoria={sub}
              onActualizada={actualizar}
              onEliminada={eliminar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCategorias() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [reintentoAcceso, setReintentoAcceso] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);
  const [seleccion, setSeleccion] = useState(null);
  const [nombreCat, setNombreCat] = useState("");
  const [creandoCat, setCreandoCat] = useState(false);
  const [mensajeCat, setMensajeCat] = useState(null);
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
        setErrorAcceso(mensajeError(errorRespuesta, "No pudimos comprobar el acceso al panel."));
      });
    return () => {
      vigente = false;
    };
  }, [reintentoAcceso]);

  useEffect(() => {
    if (!usuario || !esAdmin) return undefined;
    let vigente = true;
    listarCategoriasAdmin()
      .then((lista) => {
        if (!vigente) return;
        const ordenadas = Array.isArray(lista)
          ? [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
          : [];
        setCategorias(ordenadas);
        setError(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setError(mensajeError(errorRespuesta, "No pudimos cargar las categorías."));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [usuario, esAdmin, reintento]);

  async function crearCategoria(evento) {
    evento.preventDefault();
    if (nombreCat.trim().length < 3) {
      setMensajeCat({ tipo: "error", texto: "El nombre necesita al menos 3 caracteres." });
      return;
    }
    setCreandoCat(true);
    setMensajeCat(null);
    try {
      const nueva = await crearCategoriaAdmin({ nombre: nombreCat.trim() });
      setCategorias((actuales) =>
        [...actuales, { ...nueva, productosAsignados: 0 }].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        ),
      );
      setNombreCat("");
      setMensajeCat({ tipo: "ok", texto: "Categoría creada." });
    } catch (errorRespuesta) {
      setMensajeCat({ tipo: "error", texto: mensajeError(errorRespuesta, "No pudimos crear la categoría.") });
    } finally {
      setCreandoCat(false);
    }
  }

  async function alternarCategoria(categoria) {
    try {
      const actualizada = categoria.activa
        ? await desactivarCategoriaAdmin(categoria.id)
        : await activarCategoriaAdmin(categoria.id);
      setCategorias((actuales) =>
        actuales.map((c) => (c.id === categoria.id ? { ...c, activa: actualizada.activa } : c)),
      );
    } catch (errorRespuesta) {
      window.alert(mensajeError(errorRespuesta, "No pudimos cambiar el estado de la categoría."));
    }
  }

  const categoriaSeleccionada = categorias.find((c) => c.id === seleccion) ?? null;

  function ajustarConteoProductos() {
    // Las subcategorías no cambian el conteo de productos de la categoría; el
    // callback existe para futuras métricas. Hoy no altera nada visible.
  }

  if (usuario === undefined) return <main className={styles.acceso}><p role="status">Comprobando acceso al panel…</p></main>;
  if (!usuario) {
    if (!errorAcceso) return <Navigate to="/admin/acceso" replace />;
    return (
      <main className={styles.acceso}>
        <section className={styles.accesoCaja} role="alert">
          <h1>No pudimos conectar</h1>
          <p>{errorAcceso}</p>
          <button type="button" onClick={() => { setUsuario(undefined); setErrorAcceso(null); setReintentoAcceso((v) => v + 1); }}>
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Categorías">
        <header className={styles.cabecera}>
          <div>
            <h1>Categorías</h1>
            <p className={styles.subtitulo}>Categorías y sus subcategorías (mega-menú).</p>
          </div>
          <span className={styles.contador}>{categorias.length} {categorias.length === 1 ? "categoría" : "categorías"}</span>
        </header>

        {!esAdmin ? (
          <p className={styles.soloAdmin}>Esta sección es solo para administradores.</p>
        ) : (
          <div className={styles.cuerpo}>
            <aside className={styles.lista}>
              <form className={styles.nuevaCat} onSubmit={crearCategoria}>
                <input
                  value={nombreCat}
                  onChange={(e) => setNombreCat(e.target.value)}
                  maxLength={100}
                  placeholder="Nueva categoría"
                  aria-label="Nombre de la nueva categoría"
                />
                <button type="submit" disabled={creandoCat}>{creandoCat ? "…" : "Crear"}</button>
              </form>
              {mensajeCat && (
                <p className={mensajeCat.tipo === "error" ? styles.mensajeError : styles.mensajeOk} role="status">
                  {mensajeCat.texto}
                </p>
              )}

              {cargando ? (
                <p className={styles.estado} role="status">Cargando categorías…</p>
              ) : error ? (
                <div className={styles.estado} role="alert">
                  <span>{error}</span>
                  <button type="button" onClick={() => { setCargando(true); setReintento((v) => v + 1); }}>Reintentar</button>
                </div>
              ) : (
                categorias.map((categoria) => (
                  <button
                    key={categoria.id}
                    type="button"
                    className={`${styles.fila} ${seleccion === categoria.id ? styles.filaActiva : ""}`}
                    onClick={() => setSeleccion(categoria.id)}
                  >
                    <span className={styles.filaNombre}>{categoria.nombre}</span>
                    <span className={styles.filaMeta}>
                      {categoria.productosAsignados} prod.
                      {!categoria.activa && <span className={styles.filaOculta}> · oculta</span>}
                    </span>
                    <span
                      className={styles.filaToggle}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); alternarCategoria(categoria); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); alternarCategoria(categoria); } }}
                    >
                      {categoria.activa ? "Ocultar" : "Mostrar"}
                    </span>
                  </button>
                ))
              )}
            </aside>

            <section className={styles.detalle}>
              {categoriaSeleccionada ? (
                <PanelSubcategorias
                  key={categoriaSeleccionada.id}
                  categoria={categoriaSeleccionada}
                  onCambioConteo={ajustarConteoProductos}
                />
              ) : (
                <p className={styles.panelVacio}>Elige una categoría para gestionar sus subcategorías.</p>
              )}
            </section>
          </div>
        )}
      </AdminShell>
    </main>
  );
}
