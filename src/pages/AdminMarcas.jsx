import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  actualizarDominioBrandfetchAdmin,
  crearMarcaAdmin,
  listarMarcasAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import { crearUrlLogoBrandfetch } from "../services/marcasApi.js";
import styles from "./AdminMarcas.module.css";

function LogoMarca({ marca }) {
  const [fallo, setFallo] = useState(false);
  const origen = marca.logoUrl ?? crearUrlLogoBrandfetch(marca.brandfetchDomain);

  if (!origen || fallo) {
    return <span className={styles.logoTexto}>{marca.nombre.slice(0, 2).toUpperCase()}</span>;
  }

  return <img className={styles.logo} src={origen} alt={`Logo de ${marca.nombre}`} onError={() => setFallo(true)} />;
}

function FilaMarca({ marca, onActualizada }) {
  const [dominio, setDominio] = useState(marca.brandfetchDomain ?? "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const actualizada = await actualizarDominioBrandfetchAdmin(marca.id, dominio.trim());
      setDominio(actualizada.brandfetchDomain ?? "");
      onActualizada(actualizada);
      setMensaje({ tipo: "ok", texto: "Dominio guardado." });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error instanceof ErrorAdminApi ? error.message : "No pudimos guardar el dominio.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <article className={styles.marca}>
      <div className={styles.logoCaja}>
        <LogoMarca marca={{ ...marca, brandfetchDomain: dominio.trim() || null }} />
      </div>
      <div className={styles.infoMarca}>
        <h2>{marca.nombre}</h2>
        <p>/{marca.slug} · {marca.productosAsignados} {marca.productosAsignados === 1 ? "producto" : "productos"}</p>
      </div>
      <label className={styles.campoDominio}>
        <span>Dominio Brandfetch</span>
        <input
          type="text"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ejemplo.com"
          value={dominio}
          onChange={(event) => setDominio(event.target.value)}
          aria-describedby={`estado-marca-${marca.id}`}
        />
      </label>
      <div className={styles.accionesMarca}>
        <button type="button" className={styles.botonGuardar} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <span
          id={`estado-marca-${marca.id}`}
          className={mensaje?.tipo === "error" ? styles.mensajeError : styles.mensaje}
          role="status"
          aria-live="polite"
        >
          {mensaje?.texto}
        </span>
      </div>
    </article>
  );
}

export default function AdminMarcas() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [reintentoAcceso, setReintentoAcceso] = useState(0);
  const [marcas, setMarcas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);
  const [nombre, setNombre] = useState("");
  const [dominioNuevo, setDominioNuevo] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensajeCrear, setMensajeCrear] = useState(null);
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
    if (!usuario) return undefined;
    let vigente = true;
    listarMarcasAdmin()
      .then((lista) => {
        if (!vigente) return;
        setMarcas(Array.isArray(lista) ? lista : []);
        setError(null);
      })
      .catch((errorRespuesta) => {
        if (!vigente) return;
        if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
          setUsuario(null);
          return;
        }
        setError(errorRespuesta.message ?? "No pudimos cargar las marcas.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [usuario, reintento]);

  function actualizarMarca(actualizada) {
    setMarcas((actuales) => actuales.map((marca) => marca.id === actualizada.id ? { ...marca, ...actualizada } : marca));
  }

  async function crear(evento) {
    evento.preventDefault();
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      setMensajeCrear({ tipo: "error", texto: "Escribe un nombre de al menos 2 caracteres." });
      return;
    }

    setCreando(true);
    setMensajeCrear(null);
    try {
      const marca = await crearMarcaAdmin({
        nombre: nombreLimpio,
        ...(dominioNuevo.trim() ? { brandfetchDomain: dominioNuevo.trim() } : {}),
      });
      setMarcas((actuales) => [...actuales, { ...marca, productosAsignados: 0 }].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setNombre("");
      setDominioNuevo("");
      setMensajeCrear({ tipo: "ok", texto: "Marca creada." });
    } catch (errorRespuesta) {
      setMensajeCrear({
        tipo: "error",
        texto: errorRespuesta instanceof ErrorAdminApi ? errorRespuesta.message : "No pudimos crear la marca.",
      });
    } finally {
      setCreando(false);
    }
  }

  if (usuario === undefined) return <main className={styles.acceso}><p role="status">Comprobando acceso al panel…</p></main>;
  if (!usuario) {
    if (!errorAcceso) return <Navigate to="/admin/acceso" replace />;
    return (
      <main className={styles.acceso}>
        <section className={styles.accesoCaja} role="alert">
          <h1>No pudimos conectar</h1><p>{errorAcceso}</p>
          <button type="button" onClick={() => { setUsuario(undefined); setErrorAcceso(null); setReintentoAcceso((valor) => valor + 1); }}>Reintentar</button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Marcas">
        <header className={styles.cabecera}>
          <div><h1>Marcas</h1><p>Identidad de las marcas que aparecen en la tienda.</p></div>
          <span className={styles.contador}>{marcas.length} {marcas.length === 1 ? "marca" : "marcas"}</span>
        </header>

        {!esAdmin ? <p className={styles.soloAdmin}>Esta sección es solo para administradores.</p> : (
          <div className={styles.contenido}>
            <section className={styles.introduccion}>
              <h2>Logo desde Brandfetch</h2>
              <p>Escribe el dominio oficial, por ejemplo <strong>nestle.com</strong>. La tienda carga el logo desde Brandfetch; no se guarda ninguna clave privada en el navegador.</p>
            </section>

            <form className={styles.formulario} onSubmit={crear}>
              <div className={styles.formularioTitulo}><h2>Nueva marca</h2><span>Opcional: agrega el dominio ahora o después.</span></div>
              <label><span>Nombre</span><input value={nombre} onChange={(event) => setNombre(event.target.value)} maxLength={120} placeholder="Ej. Nestlé" /></label>
              <label><span>Dominio Brandfetch</span><input value={dominioNuevo} onChange={(event) => setDominioNuevo(event.target.value)} inputMode="url" autoCapitalize="none" spellCheck={false} placeholder="nestle.com" /></label>
              <div className={styles.formularioAcciones}>
                <button type="submit" className={styles.botonCrear} disabled={creando}>{creando ? "Creando…" : "Crear marca"}</button>
                <span className={mensajeCrear?.tipo === "error" ? styles.mensajeError : styles.mensaje} role="status" aria-live="polite">{mensajeCrear?.texto}</span>
              </div>
            </form>

            <section className={styles.lista} aria-label="Marcas existentes">
              <div className={styles.listaTitulo}><h2>Marcas existentes</h2><p>Los cambios se reflejan en la sección “Marcas en góndola”.</p></div>
              {cargando ? <p className={styles.estado} role="status">Cargando marcas…</p> : error ? (
                <div className={styles.estado} role="alert"><strong>No pudimos cargar las marcas.</strong><span>{error}</span><button type="button" onClick={() => { setCargando(true); setReintento((valor) => valor + 1); }}>Reintentar</button></div>
              ) : marcas.length ? marcas.map((marca) => <FilaMarca key={marca.id} marca={marca} onActualizada={actualizarMarca} />) : <p className={styles.estado}>Aún no hay marcas creadas.</p>}
            </section>
          </div>
        )}
      </AdminShell>
    </main>
  );
}
