import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  ErrorAdminApi,
  guardarReglasAdmin,
  obtenerReglasAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import styles from "./AdminEnvios.module.css";

// Editor de "Envíos": las reglas de logística de la tienda (antes "reglas de la
// tienda"). El backend ya expone GET/PUT /api/admin/reglas; esta pantalla es su
// interfaz. Guardar es un PUT con TODO el formulario en una transacción, igual
// que el botón "Guardar" del diseño.

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// El formulario guarda los números como texto para poder vaciar un campo mientras
// se edita (un input controlado con `value={0}` no deja borrar el 0). Se convierten
// a enteros recién al guardar. Así separamos "lo que se ve" de "lo que se envía".
function reglasAFormulario(reglas) {
  return {
    envioGratisDesde: String(reglas.envioGratisDesde ?? ""),
    tarifaBase: String(reglas.tarifaBase ?? ""),
    corteRetiroHoy: reglas.corteRetiroHoy ?? "",
    preparacionHoras: String(reglas.preparacionHoras ?? ""),
    horarioEntrega: reglas.horarioEntrega ?? "",
    tarifasComuna: (reglas.tarifasComuna ?? []).map((tarifa) => ({
      nombre: tarifa.nombre ?? "",
      tarifa: String(tarifa.tarifa ?? ""),
      plazoHoras: tarifa.plazoHoras == null ? "" : String(tarifa.plazoHoras),
    })),
  };
}

// Aproximación de la normalización del backend (sin tildes, minúsculas) solo para
// avisar de comunas repetidas antes de mandar; el backend es la validación real.
function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Valida y arma el payload de enteros. Devuelve { datos } o { error } con un
// mensaje claro; espeja el contrato Zod del backend para fallar temprano y sin red.
function construirPayload(form) {
  const entero = (valor) => {
    const n = Number(valor);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };

  const envioGratisDesde = entero(form.envioGratisDesde);
  const tarifaBase = entero(form.tarifaBase);
  const preparacionHoras = entero(form.preparacionHoras);

  if (envioGratisDesde === null) return { error: "El umbral de envío gratis debe ser un número entero (0 o más)." };
  if (tarifaBase === null) return { error: "La tarifa base debe ser un número entero (0 o más)." };
  if (preparacionHoras === null || preparacionHoras > 240) return { error: "Las horas de preparación deben ser un entero entre 0 y 240." };
  if (!HORA_HHMM.test(form.corteRetiroHoy.trim())) return { error: "El corte de retiro debe tener formato HH:MM (24h)." };

  const horarioEntrega = form.horarioEntrega.trim();
  if (horarioEntrega.length < 2 || horarioEntrega.length > 120) return { error: "El horario de entrega debe tener entre 2 y 120 caracteres." };

  const tarifasComuna = [];
  for (const [i, fila] of form.tarifasComuna.entries()) {
    const nombre = fila.nombre.trim();
    if (nombre.length < 2 || nombre.length > 80) return { error: `La comuna de la fila ${i + 1} necesita un nombre de 2 a 80 caracteres.` };
    const tarifa = entero(fila.tarifa);
    if (tarifa === null || tarifa > 1_000_000) return { error: `La tarifa de "${nombre}" debe ser un entero entre 0 y 1.000.000.` };
    let plazoHoras = null;
    if (fila.plazoHoras.trim() !== "") {
      plazoHoras = entero(fila.plazoHoras);
      if (plazoHoras === null || plazoHoras > 720) return { error: `El plazo de "${nombre}" debe ser un entero entre 0 y 720 horas, o quedar vacío.` };
    }
    tarifasComuna.push({ nombre, tarifa, plazoHoras });
  }

  const claves = tarifasComuna.map((t) => normalizar(t.nombre));
  if (new Set(claves).size !== claves.length) return { error: "Hay comunas repetidas en la lista." };

  return {
    datos: { envioGratisDesde, tarifaBase, corteRetiroHoy: form.corteRetiroHoy.trim(), preparacionHoras, horarioEntrega, tarifasComuna },
  };
}

const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export default function AdminEnvios() {
  const [usuario, setUsuario] = useState(undefined);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);

  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }

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
    return () => { vigente = false; };
  }, [intentoAcceso]);

  useEffect(() => {
    if (!esAdmin) return undefined;
    let vigente = true;

    obtenerReglasAdmin()
      .then((reglas) => {
        if (!vigente) return;
        setForm(reglasAFormulario(reglas));
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

    return () => { vigente = false; };
  }, [esAdmin, intento]);

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

  function editar(campo, valor) {
    setMensaje(null);
    setForm((previo) => ({ ...previo, [campo]: valor }));
  }

  function editarTarifa(indice, campo, valor) {
    setMensaje(null);
    setForm((previo) => ({
      ...previo,
      tarifasComuna: previo.tarifasComuna.map((fila, i) =>
        i === indice ? { ...fila, [campo]: valor } : fila,
      ),
    }));
  }

  function agregarTarifa() {
    setMensaje(null);
    setForm((previo) => ({
      ...previo,
      tarifasComuna: [...previo.tarifasComuna, { nombre: "", tarifa: "", plazoHoras: "" }],
    }));
  }

  function quitarTarifa(indice) {
    setMensaje(null);
    setForm((previo) => ({
      ...previo,
      tarifasComuna: previo.tarifasComuna.filter((_, i) => i !== indice),
    }));
  }

  async function guardar(evento) {
    evento.preventDefault();
    setMensaje(null);

    const resultado = construirPayload(form);
    if (resultado.error) {
      setMensaje({ tipo: "error", texto: resultado.error });
      return;
    }

    setGuardando(true);
    try {
      const reglas = await guardarReglasAdmin(resultado.datos);
      setForm(reglasAFormulario(reglas)); // refleja lo que quedó en la base (claves normalizadas, etc.)
      setMensaje({ tipo: "ok", texto: "Cambios guardados." });
    } catch (errorRespuesta) {
      if (errorRespuesta instanceof ErrorAdminApi && errorRespuesta.status === 401) {
        setUsuario(null);
        return;
      }
      setMensaje({
        tipo: "error",
        texto:
          errorRespuesta instanceof ErrorAdminApi
            ? errorRespuesta.message
            : "No pudimos guardar los cambios.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className={styles.fondo}>
      <AdminShell usuario={usuario} seccion="Envíos">
        <div className={styles.pagina}>
          <header className={styles.cabecera}>
            <h1 className={styles.titulo}>Envíos</h1>
            <p className={styles.subtitulo}>
              Reglas de entrega y logística. El servidor las usa para cotizar cada
              pedido; el cliente nunca calcula el envío.
            </p>
          </header>

          {!esAdmin ? (
            <section className={styles.tarjeta}>
              <p className={styles.soloAdmin}>
                Esta sección es solo para administradores. Pídele a un administrador que
                ajuste las reglas de envío.
              </p>
            </section>
          ) : cargando && !form ? (
            <p className={styles.estado} role="status">Cargando reglas…</p>
          ) : error ? (
            <div className={styles.estado} role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setCargando(true);
                  setError(null);
                  setIntento((valor) => valor + 1);
                }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            form && (
              <form className={styles.cuerpo} onSubmit={guardar}>
                <section className={styles.tarjeta}>
                  <h2 className={styles.tarjetaTitulo}>Costo de envío</h2>
                  <div className={styles.grid2}>
                    <label className={styles.campo}>
                      <span>Envío gratis desde (CLP)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={form.envioGratisDesde}
                        onChange={(e) => editar("envioGratisDesde", e.target.value)}
                      />
                      <small className={styles.ayuda}>
                        Sobre este monto el envío es gratis
                        {form.envioGratisDesde !== "" && Number.isFinite(Number(form.envioGratisDesde))
                          ? ` (${CLP.format(Number(form.envioGratisDesde))}).`
                          : "."}
                      </small>
                    </label>
                    <label className={styles.campo}>
                      <span>Tarifa base de despacho (CLP)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={form.tarifaBase}
                        onChange={(e) => editar("tarifaBase", e.target.value)}
                      />
                      <small className={styles.ayuda}>
                        Costo por defecto cuando una comuna no tiene tarifa propia.
                      </small>
                    </label>
                  </div>
                </section>

                <section className={styles.tarjeta}>
                  <h2 className={styles.tarjetaTitulo}>Retiro y preparación</h2>
                  <div className={styles.grid3}>
                    <label className={styles.campo}>
                      <span>Corte de retiro (HH:MM)</span>
                      <input
                        type="time"
                        value={form.corteRetiroHoy}
                        onChange={(e) => editar("corteRetiroHoy", e.target.value)}
                      />
                      <small className={styles.ayuda}>
                        Hora tope para pedidos que se retiran el mismo día.
                      </small>
                    </label>
                    <label className={styles.campo}>
                      <span>Horas de preparación</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={240}
                        value={form.preparacionHoras}
                        onChange={(e) => editar("preparacionHoras", e.target.value)}
                      />
                      <small className={styles.ayuda}>Tiempo antes de tener el pedido listo.</small>
                    </label>
                    <label className={styles.campo}>
                      <span>Horario de entrega</span>
                      <input
                        type="text"
                        maxLength={120}
                        value={form.horarioEntrega}
                        onChange={(e) => editar("horarioEntrega", e.target.value)}
                        placeholder="Lun a Vie · 09:00 a 18:00"
                      />
                      <small className={styles.ayuda}>Ventana que ve el cliente en el detalle.</small>
                    </label>
                  </div>
                </section>

                <section className={styles.tarjeta}>
                  <div className={styles.tarjetaCabecera}>
                    <h2 className={styles.tarjetaTitulo}>Tarifas por comuna</h2>
                    <button type="button" className={styles.botonAgregar} onClick={agregarTarifa}>
                      + Agregar comuna
                    </button>
                  </div>

                  {form.tarifasComuna.length === 0 ? (
                    <p className={styles.vacio}>
                      Sin tarifas específicas. Todas las comunas usan la tarifa base.
                    </p>
                  ) : (
                    <div className={styles.tablaScroll}>
                      <table className={styles.tabla}>
                        <thead>
                          <tr>
                            <th>Comuna</th>
                            <th className={styles.colNum}>Tarifa (CLP)</th>
                            <th className={styles.colNum}>Plazo (horas)</th>
                            <th className={styles.colAccion} aria-label="Quitar" />
                          </tr>
                        </thead>
                        <tbody>
                          {form.tarifasComuna.map((fila, i) => (
                            <tr key={i}>
                              <td>
                                <input
                                  className={styles.inputCelda}
                                  type="text"
                                  value={fila.nombre}
                                  maxLength={80}
                                  onChange={(e) => editarTarifa(i, "nombre", e.target.value)}
                                  placeholder="Providencia"
                                />
                              </td>
                              <td className={styles.colNum}>
                                <input
                                  className={styles.inputCeldaNum}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  value={fila.tarifa}
                                  onChange={(e) => editarTarifa(i, "tarifa", e.target.value)}
                                />
                              </td>
                              <td className={styles.colNum}>
                                <input
                                  className={styles.inputCeldaNum}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  value={fila.plazoHoras}
                                  onChange={(e) => editarTarifa(i, "plazoHoras", e.target.value)}
                                  placeholder="—"
                                />
                              </td>
                              <td className={styles.colAccion}>
                                <button
                                  type="button"
                                  className={styles.botonQuitar}
                                  onClick={() => quitarTarifa(i)}
                                  aria-label={`Quitar ${fila.nombre || "comuna"}`}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className={styles.notaPlazo}>
                    Deja el plazo vacío para "se confirma al despachar".
                  </p>
                </section>

                <div className={styles.barraGuardar}>
                  <button type="submit" className={styles.botonGuardar} disabled={guardando}>
                    {guardando ? "Guardando…" : "Guardar cambios"}
                  </button>
                  {mensaje && (
                    <span
                      className={mensaje.tipo === "ok" ? styles.mensajeOk : styles.mensajeError}
                      role="status"
                    >
                      {mensaje.texto}
                    </span>
                  )}
                </div>
              </form>
            )
          )}
        </div>
      </AdminShell>
    </main>
  );
}
