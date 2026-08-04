import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  actualizarProductoAdmin,
  crearProductoAdmin,
  ErrorAdminApi,
  obtenerOpcionesProductoAdmin,
  obtenerProductoAdmin,
  obtenerSesionAdmin,
} from "../services/adminApi.js";
import {
  calcularPrecioPorUnidad,
  crearFormularioProducto,
  normalizarPayloadProductoAdmin,
  PRODUCTO_FORMULARIO_INICIAL,
  validarFormularioProducto,
} from "./adminProductoFormulario.js";
import styles from "./AdminProductoEditor.module.css";

function Campo({ id, etiqueta, error, ayuda, children, requerido = false }) {
  const mensajeId = `${id}-error`;
  const ayudaId = ayuda ? `${id}-ayuda` : undefined;
  const describedBy = error ? mensajeId : ayudaId;

  return (
    <div className={styles.grupo}>
      <label htmlFor={id}>
        {etiqueta}
        {requerido && <span className={styles.requerido}> *</span>}
      </label>
      {children({
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        id,
      })}
      {ayuda && !error && <span id={ayudaId} className={styles.ayuda}>{ayuda}</span>}
      {error && <span id={mensajeId} className={styles.errorCampo} role="alert">{error}</span>}
    </div>
  );
}

function EstadoEditor({ usuario, children }) {
  return <AdminShell usuario={usuario}>{children}</AdminShell>;
}

export default function AdminProductoEditor() {
  const { id } = useParams();
  const navegar = useNavigate();
  const esNuevo = !id;
  const [usuario, setUsuario] = useState(undefined);
  const [formulario, setFormulario] = useState(PRODUCTO_FORMULARIO_INICIAL);
  const [referencias, setReferencias] = useState({ categorias: [], marcas: [] });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [detallesAbiertos, setDetallesAbiertos] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState(null);

  const precioPorUnidad = calcularPrecioPorUnidad(
    formulario.precio,
    formulario.contenidoCantidad,
    formulario.contenidoUnidad,
  );

  // La sesión se consulta de nuevo al entrar por URL directa; el listado no
  // debe ser un requisito para proteger el editor.
  useEffect(() => {
    let vigente = true;
    obtenerSesionAdmin()
      .then((sesion) => {
        if (vigente) setUsuario(sesion);
      })
      .catch((error) => {
        if (vigente) {
          setErrorGeneral(error.message);
          setUsuario(null);
        }
      });

    return () => { vigente = false; };
  }, []);

  // El editor carga referencias y detalle en paralelo. En creación no pedimos
  // detalle; en edición el backend entrega relaciones completas para hidratar IDs.
  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;

    const detalle = esNuevo ? Promise.resolve(null) : obtenerProductoAdmin(id);
    Promise.all([obtenerOpcionesProductoAdmin(), detalle])
      .then(([opciones, producto]) => {
        if (!vigente) return;
        setErrorGeneral(null);
        setReferencias({
          categorias: opciones?.categorias ?? [],
          marcas: opciones?.marcas ?? [],
        });
        setFormulario(crearFormularioProducto(producto ?? {}));
      })
      .catch((error) => {
        if (vigente) setErrorGeneral(error.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => { vigente = false; };
  }, [esNuevo, id, usuario]);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.type === "checkbox" ? evento.target.checked : evento.target.value;
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setTocados((actual) => ({ ...actual, [campo]: true }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    setErrorGeneral(null);
  };

  const marcarTocado = (campo) => {
    setTocados((actual) => ({ ...actual, [campo]: true }));
    setErrores(validarFormularioProducto(formulario, { esNuevo }));
  };

  async function guardar(evento) {
    evento.preventDefault();
    const siguientesErrores = validarFormularioProducto(formulario, { esNuevo });
    setErrores(siguientesErrores);
    setTocados(Object.fromEntries(Object.keys(formulario).map((campo) => [campo, true])));
    if (Object.keys(siguientesErrores).length > 0) return;

    setGuardando(true);
    setErrorGeneral(null);
    const payload = normalizarPayloadProductoAdmin(formulario, { esNuevo });

    try {
      if (esNuevo) await crearProductoAdmin(payload);
      else await actualizarProductoAdmin(id, payload);
      navegar("/admin/productos");
    } catch (error) {
      setErrorGeneral(
        error instanceof ErrorAdminApi
          ? error.message
          : "No pudimos guardar el producto. Inténtalo nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (usuario === undefined) {
    return <main className={styles.estadoPantalla}><p role="status">Comprobando acceso al panel…</p></main>;
  }

  if (!usuario) return <Navigate to="/admin/productos" replace />;

  if (cargando) {
    return (
      <main className={styles.fondoEditor}>
        <EstadoEditor usuario={usuario}>
          <div className={styles.estadoContenido} role="status">Cargando editor…</div>
        </EstadoEditor>
      </main>
    );
  }

  if (errorGeneral && !Object.keys(formulario).some((campo) => formulario[campo])) {
    return (
      <main className={styles.fondoEditor}>
        <EstadoEditor usuario={usuario}>
          <div className={styles.estadoContenido} role="alert">
            <strong>No pudimos abrir el editor</strong>
            <span>{errorGeneral}</span>
            <Link className={styles.botonSecundario} to="/admin/productos">Volver a Productos</Link>
          </div>
        </EstadoEditor>
      </main>
    );
  }

  return (
    <main className={styles.fondoEditor}>
      <AdminShell usuario={usuario}>
        <header className={styles.cabeceraEditor}>
          <div>
            <Link className={styles.volver} to="/admin/productos">← Productos</Link>
            <p className={styles.eyebrow}>Catálogo · {esNuevo ? "Nuevo registro" : "Edición"}</p>
            <h1>{esNuevo ? "Nuevo producto" : "Editar producto"}</h1>
          </div>
          <div className={styles.accionesCabecera}>
            <Link className={styles.botonSecundario} to="/admin/productos">Cancelar</Link>
            <button className={styles.botonPrimario} type="submit" form="formulario-producto" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </header>

        <form id="formulario-producto" className={styles.formulario} onSubmit={guardar} noValidate>
          <section className={styles.seccion} aria-labelledby="titulo-informacion">
            <div className={styles.tituloSeccion}>
              <p className={styles.eyebrow}>01 · Información</p>
              <h2 id="titulo-informacion">Datos principales</h2>
              <p>Lo que las personas verán en el catálogo.</p>
            </div>

            <Campo id="nombre" etiqueta="Nombre del producto" error={tocados.nombre && errores.nombre} requerido>
              {(props) => (
                <input {...props} className={styles.input} type="text" value={formulario.nombre} onChange={cambiar("nombre")} onBlur={() => marcarTocado("nombre")} maxLength="200" />
              )}
            </Campo>

            <Campo id="descripcion" etiqueta="Descripción" error={tocados.descripcion && errores.descripcion} requerido>
              {(props) => (
                <textarea {...props} className={styles.textarea} value={formulario.descripcion} onChange={cambiar("descripcion")} onBlur={() => marcarTocado("descripcion")} maxLength="10000" rows="4" />
              )}
            </Campo>

            <div className={styles.filaDos}>
              <Campo id="categoriaId" etiqueta="Categoría" error={tocados.categoriaId && errores.categoriaId} requerido>
                {(props) => (
                  <select {...props} className={styles.input} value={formulario.categoriaId} onChange={cambiar("categoriaId")} onBlur={() => marcarTocado("categoriaId")}>
                    <option value="">Selecciona una categoría</option>
                    {referencias.categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                  </select>
                )}
              </Campo>
              <Campo id="marcaId" etiqueta="Marca" error={tocados.marcaId && errores.marcaId} requerido>
                {(props) => (
                  <select {...props} className={styles.input} value={formulario.marcaId} onChange={cambiar("marcaId")} onBlur={() => marcarTocado("marcaId")}>
                    <option value="">Selecciona una marca</option>
                    {referencias.marcas.map((marca) => <option key={marca.id} value={marca.id}>{marca.nombre}</option>)}
                  </select>
                )}
              </Campo>
            </div>
          </section>

          <section className={styles.seccion} aria-labelledby="titulo-comercial">
            <div className={styles.tituloSeccion}>
              <p className={styles.eyebrow}>02 · Comercial</p>
              <h2 id="titulo-comercial">Precio e inventario</h2>
              <p>Montos enteros en CLP y unidades disponibles.</p>
            </div>

            <div className={styles.filaTres}>
              <Campo id="precio" etiqueta="Precio actual" error={tocados.precio && errores.precio} requerido>
                {(props) => <input {...props} className={styles.input} type="number" min="0" step="1" value={formulario.precio} onChange={cambiar("precio")} onBlur={() => marcarTocado("precio")} />}
              </Campo>
              <Campo id="precioAnterior" etiqueta="Precio anterior" error={tocados.precioAnterior && errores.precioAnterior} ayuda="Opcional para ofertas.">
                {(props) => <input {...props} className={styles.input} type="number" min="0" step="1" value={formulario.precioAnterior} onChange={cambiar("precioAnterior")} onBlur={() => marcarTocado("precioAnterior")} />}
              </Campo>
              <Campo id="stock" etiqueta="Stock" error={tocados.stock && errores.stock} requerido>
                {(props) => <input {...props} className={styles.input} type="number" min="0" step="1" value={formulario.stock} onChange={cambiar("stock")} onBlur={() => marcarTocado("stock")} />}
              </Campo>
            </div>

            {!esNuevo && (
              <Campo id="estado" etiqueta="Estado editorial" error={tocados.estado && errores.estado} requerido>
                {(props) => (
                  <select {...props} className={styles.input} value={formulario.estado} onChange={cambiar("estado")} onBlur={() => marcarTocado("estado")}>
                    <option value="BORRADOR">Borrador</option>
                    <option value="PUBLICADO">Publicado</option>
                    <option value="ARCHIVADO">Archivado</option>
                  </select>
                )}
              </Campo>
            )}

            <label className={styles.casilla}>
              <input type="checkbox" checked={formulario.destacado} onChange={cambiar("destacado")} />
              <span>
                <strong>Producto destacado</strong>
                <small>Puede aparecer en espacios editoriales del catálogo.</small>
              </span>
            </label>
          </section>

          <section className={`${styles.seccion} ${styles.seccionDetalles}`} aria-labelledby="titulo-detalles">
            <button
              className={styles.detallesTrigger}
              type="button"
              aria-expanded={detallesAbiertos}
              aria-controls="panel-mas-detalles"
              onClick={() => setDetallesAbiertos((abierto) => !abierto)}
            >
              <span>
                <span className={styles.eyebrow}>03 · Opcional</span>
                <strong id="titulo-detalles">Más detalles</strong>
              </span>
              <span className={`${styles.chevron} ${detallesAbiertos ? styles.chevronAbierto : ""}`} aria-hidden="true">⌄</span>
            </button>

            {detallesAbiertos && (
              <div id="panel-mas-detalles" className={styles.detallesPanel}>
                <p className={styles.detallesIntro}>
                  Completa esta información para mejorar la ficha, el despacho y el cálculo por unidad.
                </p>

                <Campo id="slug" etiqueta="URL / slug" error={tocados.slug && errores.slug} ayuda="Solo minúsculas, números y guiones.">
                  {(props) => <input {...props} className={styles.input} type="text" value={formulario.slug} onChange={cambiar("slug")} onBlur={() => marcarTocado("slug")} maxLength="180" placeholder="aceite-de-oliva-500" />}
                </Campo>

                <div className={styles.filaDos}>
                  <Campo id="codigoBarras" etiqueta="Código de barras" error={tocados.codigoBarras && errores.codigoBarras}>
                    {(props) => <input {...props} className={styles.input} type="text" value={formulario.codigoBarras} onChange={cambiar("codigoBarras")} onBlur={() => marcarTocado("codigoBarras")} maxLength="50" />}
                  </Campo>
                  <Campo id="origen" etiqueta="Origen" error={tocados.origen && errores.origen}>
                    {(props) => <input {...props} className={styles.input} type="text" value={formulario.origen} onChange={cambiar("origen")} onBlur={() => marcarTocado("origen")} maxLength="120" placeholder="Chile" />}
                  </Campo>
                </div>

                <div className={styles.filaTres}>
                  <Campo id="contenidoCantidad" etiqueta="Contenido" error={tocados.contenidoCantidad && errores.contenidoCantidad}>
                    {(props) => <input {...props} className={styles.input} type="number" min="0" step="0.001" value={formulario.contenidoCantidad} onChange={cambiar("contenidoCantidad")} onBlur={() => marcarTocado("contenidoCantidad")} />}
                  </Campo>
                  <Campo id="contenidoUnidad" etiqueta="Unidad" error={tocados.contenidoUnidad && errores.contenidoUnidad}>
                    {(props) => (
                      <select {...props} className={styles.input} value={formulario.contenidoUnidad} onChange={cambiar("contenidoUnidad")} onBlur={() => marcarTocado("contenidoUnidad")}>
                        <option value="">Selecciona</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="un">un</option>
                      </select>
                    )}
                  </Campo>
                  <div className={styles.precioUnidad} aria-live="polite">
                    <span>Precio por unidad</span>
                    <strong>{precioPorUnidad ? `$${precioPorUnidad.monto.toLocaleString("es-CL")} / ${precioPorUnidad.unidad}` : "—"}</strong>
                  </div>
                </div>

                <div className={styles.filaDos}>
                  <Campo id="fechaVencimiento" etiqueta="Vence" error={tocados.fechaVencimiento && errores.fechaVencimiento}>
                    {(props) => <input {...props} className={styles.input} type="date" value={formulario.fechaVencimiento} onChange={cambiar("fechaVencimiento")} onBlur={() => marcarTocado("fechaVencimiento")} />}
                  </Campo>
                  <Campo id="pesoDespachoGramos" etiqueta="Peso de despacho (g)" error={tocados.pesoDespachoGramos && errores.pesoDespachoGramos}>
                    {(props) => <input {...props} className={styles.input} type="number" min="1" step="1" value={formulario.pesoDespachoGramos} onChange={cambiar("pesoDespachoGramos")} onBlur={() => marcarTocado("pesoDespachoGramos")} />}
                  </Campo>
                </div>

                <Campo id="alertaStockBajo" etiqueta="Avisar cuando queden" error={tocados.alertaStockBajo && errores.alertaStockBajo} ayuda="Opcional; se usa para alertas internas de inventario.">
                  {(props) => <input {...props} className={styles.input} type="number" min="1" step="1" value={formulario.alertaStockBajo} onChange={cambiar("alertaStockBajo")} onBlur={() => marcarTocado("alertaStockBajo")} />}
                </Campo>
              </div>
            )}
          </section>

          {errorGeneral && <p className={styles.errorGeneral} role="alert">{errorGeneral}</p>}
        </form>
      </AdminShell>
    </main>
  );
}
