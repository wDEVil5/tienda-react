import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AdminShell from "../components/admin/AdminShell.jsx";
import {
  actualizarProductoAdmin,
  crearProductoAdmin,
  ErrorAdminApi,
  listarAtributosCategoriaAdmin,
  obtenerOpcionesProductoAdmin,
  obtenerProductoAdmin,
  obtenerSesionAdmin,
  reemplazarImagenesProductoAdmin,
  subirImagenProductoAdmin,
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

function Switch({ id, etiqueta, ayuda, checked, disabled = false, onChange }) {
  return (
    <label className={`${styles.switchFila} ${disabled ? styles.switchDeshabilitado : ""}`} htmlFor={id}>
      <span>
        <strong>{etiqueta}</strong>
        {ayuda && <small>{ayuda}</small>}
      </span>
      <span className={styles.switchControl}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(evento) => onChange(evento.target.checked)}
        />
        <span className={styles.switchTrack} aria-hidden="true"><span /></span>
      </span>
    </label>
  );
}

const MAXIMO_IMAGENES_PRODUCTO = 5;

function GaleriaProducto({ imagenes, nombre, productoId, cargando, onSubir, onReordenar, onEliminar, error }) {
  const inputRef = useRef(null);
  const [arrastrada, setArrastrada] = useState(null);

  function soltar(indiceDestino) {
    if (arrastrada === null || arrastrada === indiceDestino) return;
    onReordenar(arrastrada, indiceDestino);
    setArrastrada(null);
  }

  return (
    <div className={styles.galeriaBloque}>
      <div className={styles.galeriaSlots}>
        {imagenes.map((imagen, indice) => (
          <div
            className={`${styles.slotImagen} ${styles.slotConImagen}`}
            key={imagen.id ?? imagen.url}
            draggable
            onDragStart={() => setArrastrada(indice)}
            onDragEnd={() => setArrastrada(null)}
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={() => soltar(indice)}
          >
            <img src={imagen.url} alt={imagen.textoAlternativo || `${nombre}, imagen ${indice + 1}`} />
            <button
              className={styles.eliminarImagen}
              type="button"
              disabled={cargando}
              aria-label={`Eliminar imagen ${indice + 1} de ${nombre}`}
              title="Eliminar imagen"
              onClick={(evento) => {
                evento.stopPropagation();
                onEliminar(indice);
              }}
            >
              ×
            </button>
          </div>
        ))}
        {imagenes.length === 0 && <span className={styles.slotVacio} aria-hidden="true" />}
        {imagenes.length < MAXIMO_IMAGENES_PRODUCTO && (
          <button
            className={styles.subirImagen}
            type="button"
            disabled={!productoId || cargando}
            onClick={() => inputRef.current?.click()}
            title={!productoId ? "Guarda el producto antes de subir imágenes" : undefined}
          >
            <span aria-hidden="true">+</span>
            <small>{cargando ? "Subiendo" : "Subir"}</small>
          </button>
        )}
        <input
          ref={inputRef}
          className={styles.inputArchivo}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(evento) => {
            const archivo = evento.target.files?.[0];
            if (archivo) onSubir(archivo);
            evento.target.value = "";
          }}
        />
      </div>
      <div className={styles.galeriaAyuda}>
        <strong>{imagenes.length ? "Arrastra para reordenar" : "Galería del producto"}</strong>
        <span>{imagenes.length}/{MAXIMO_IMAGENES_PRODUCTO} imágenes · la primera aparece en la tarjeta<br />JPG, PNG o WebP · máximo 5 MB · mínimo 800×800</span>
        {!productoId && <small>Guarda el producto para activar la galería.</small>}
        {error && <small className={styles.errorCampo}>{error}</small>}
      </div>
    </div>
  );
}

function EstadoEditor({ usuario, children }) {
  return (
    <main className={styles.fondoEditor}>
      <AdminShell usuario={usuario}>{children}</AdminShell>
    </main>
  );
}

function AtributosProducto({ atributos, valores, cargando, onCambiar }) {
  if (cargando) return <p className={styles.atributosEstado}>Cargando filtros de la categoría…</p>;
  if (atributos.length === 0) return null;

  return (
    <section className={styles.atributosProducto} aria-labelledby="atributos-producto-titulo">
      <div>
        <h2 id="atributos-producto-titulo">Características para filtrar</h2>
        <p>Estas opciones aparecerán como filtros cuando existan productos publicados con ellas.</p>
      </div>
      <div className={styles.atributosCampos}>
        {atributos.map((atributo) => {
          const opcionElegida = valores.find((valor) => valor.atributoId === atributo.id)?.opcionId ?? "";
          return (
            <label key={atributo.id} className={styles.atributoCampo}>
              <span>{atributo.nombre}</span>
              <select value={opcionElegida} onChange={(evento) => onCambiar(atributo.id, evento.target.value)}>
                <option value="">Sin especificar</option>
                {atributo.opciones.filter((opcion) => opcion.activa).map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminProductoEditor() {
  const { id } = useParams();
  const navegar = useNavigate();
  const esNuevo = !id;
  const [usuario, setUsuario] = useState(undefined);
  const [formulario, setFormulario] = useState(PRODUCTO_FORMULARIO_INICIAL);
  const [referencias, setReferencias] = useState({ categorias: [], subcategorias: [], subcategoriasHijas: [], marcas: [], etiquetas: [] });
  const [atributosCategoria, setAtributosCategoria] = useState([]);
  const [cargandoAtributos, setCargandoAtributos] = useState(false);
  const [errorAtributos, setErrorAtributos] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [detallesAbiertos, setDetallesAbiertos] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [errorGaleria, setErrorGaleria] = useState(null);
  const [errorAcceso, setErrorAcceso] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [intentoAcceso, setIntentoAcceso] = useState(0);
  const [intentoCarga, setIntentoCarga] = useState(0);

  const precioPorUnidad = calcularPrecioPorUnidad(
    formulario.precio,
    formulario.contenidoCantidad,
    formulario.contenidoUnidad,
  );

  useEffect(() => {
    let vigente = true;
    obtenerSesionAdmin()
      .then((sesion) => {
        if (vigente) {
          setErrorAcceso(null);
          setUsuario(sesion);
        }
      })
      .catch((error) => {
        if (vigente) {
          setErrorAcceso(error instanceof ErrorAdminApi ? error.message : "No pudimos comprobar el acceso al panel.");
          setUsuario(null);
        }
      });
    return () => { vigente = false; };
  }, [intentoAcceso]);

  useEffect(() => {
    if (!usuario) return undefined;
    let vigente = true;
    const detalle = esNuevo ? Promise.resolve(null) : obtenerProductoAdmin(id);

    Promise.all([obtenerOpcionesProductoAdmin(), detalle])
      .then(([opciones, producto]) => {
        if (!vigente) return;
        setReferencias({
          categorias: opciones?.categorias ?? [],
          subcategorias: opciones?.subcategorias ?? [],
          subcategoriasHijas: opciones?.subcategoriasHijas ?? [],
          marcas: opciones?.marcas ?? [],
          etiquetas: opciones?.etiquetas ?? [],
        });
        setFormulario(crearFormularioProducto(producto ?? {}));
        setImagenes(producto?.imagenes ?? []);
        setErrorCarga(null);
      })
      .catch((error) => {
        if (vigente) setErrorCarga(error instanceof ErrorAdminApi ? error.message : "No pudimos abrir el editor.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => { vigente = false; };
  }, [esNuevo, id, usuario, intentoCarga]);

  useEffect(() => {
    if (!usuario || !formulario.categoriaId) {
      return undefined;
    }
    let vigente = true;
    listarAtributosCategoriaAdmin(formulario.categoriaId)
      .then((lista) => {
        if (vigente) {
          setAtributosCategoria((Array.isArray(lista) ? lista : []).filter((atributo) => atributo.activo));
          setCargandoAtributos(false);
        }
      })
      .catch((error) => {
        if (vigente) {
          setErrorAtributos(error instanceof ErrorAdminApi ? error.message : "No pudimos cargar los filtros de esta categoría.");
          setCargandoAtributos(false);
        }
      })
    return () => { vigente = false; };
  }, [formulario.categoriaId, usuario]);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.type === "checkbox" ? evento.target.checked : evento.target.value;
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setTocados((actual) => ({ ...actual, [campo]: true }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    setErrorGeneral(null);
  };

  const cambiarValor = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setTocados((actual) => ({ ...actual, [campo]: true }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
  };

  // Al cambiar la categoría, la subcategoría y su hija dejan de ser válidas
  // (pertenecen a la anterior): las limpiamos para no enviar una combinación
  // inconsistente.
  const cambiarCategoria = (evento) => {
    const valor = evento.target.value;
    setFormulario((actual) => ({ ...actual, categoriaId: valor, subcategoriaId: "", subcategoriaHijaId: "", atributos: [] }));
    setAtributosCategoria([]);
    setCargandoAtributos(Boolean(valor));
    setErrorAtributos(null);
    setTocados((actual) => ({ ...actual, categoriaId: true }));
    setErrores((actual) => ({ ...actual, categoriaId: undefined }));
    setErrorGeneral(null);
  };

  // Al cambiar la subcategoría, su hija (tercer nivel) deja de pertenecerle: se
  // limpia para no enviar una combinación cruzada.
  const cambiarSubcategoria = (evento) => {
    const valor = evento.target.value;
    setFormulario((actual) => ({ ...actual, subcategoriaId: valor, subcategoriaHijaId: "" }));
    setTocados((actual) => ({ ...actual, subcategoriaId: true }));
    setErrores((actual) => ({ ...actual, subcategoriaId: undefined }));
    setErrorGeneral(null);
  };

  const cambiarAtributo = (atributoId, opcionId) => {
    setFormulario((actual) => ({
      ...actual,
      atributos: opcionId
        ? [...actual.atributos.filter((valor) => valor.atributoId !== atributoId), { atributoId, opcionId }]
        : actual.atributos.filter((valor) => valor.atributoId !== atributoId),
    }));
    setErrorGeneral(null);
  };

  const marcarTocado = (campo) => {
    setTocados((actual) => ({ ...actual, [campo]: true }));
    setErrores(validarFormularioProducto(formulario, { esNuevo }));
  };

  async function subirImagen(archivo) {
    if (!id) return;
    setCargandoImagen(true);
    setErrorGaleria(null);
    try {
      const subida = await subirImagenProductoAdmin(archivo);
      const siguiente = [
        ...imagenes,
        {
          url: subida.url,
          storageKey: subida.storageKey,
          textoAlternativo: formulario.nombre,
        },
      ].slice(0, MAXIMO_IMAGENES_PRODUCTO);
      const producto = await reemplazarImagenesProductoAdmin(id, siguiente);
      setImagenes(producto?.imagenes ?? siguiente);
    } catch (error) {
      setErrorGaleria(error instanceof ErrorAdminApi ? error.message : "No pudimos subir la imagen.");
    } finally {
      setCargandoImagen(false);
    }
  }

  async function reordenarImagenes(indiceOrigen, indiceDestino) {
    const siguiente = [...imagenes];
    const [movida] = siguiente.splice(indiceOrigen, 1);
    siguiente.splice(indiceDestino, 0, movida);
    setImagenes(siguiente);
    try {
      const producto = await reemplazarImagenesProductoAdmin(id, siguiente);
      setImagenes(producto?.imagenes ?? siguiente);
    } catch (error) {
      setErrorGaleria(error instanceof ErrorAdminApi ? error.message : "No pudimos guardar el orden de las imágenes.");
      setImagenes(imagenes);
    }
  }

  async function eliminarImagen(indice) {
    const siguiente = imagenes.filter((_, indiceActual) => indiceActual !== indice);
    setCargandoImagen(true);
    setErrorGaleria(null);
    try {
      const producto = await reemplazarImagenesProductoAdmin(id, siguiente);
      setImagenes(producto?.imagenes ?? siguiente);
    } catch (error) {
      setErrorGaleria(error instanceof ErrorAdminApi ? error.message : "No pudimos eliminar la imagen.");
    } finally {
      setCargandoImagen(false);
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    const siguientesErrores = validarFormularioProducto(formulario, { esNuevo });
    setErrores(siguientesErrores);
    setTocados(Object.fromEntries(Object.keys(formulario).map((campo) => [campo, true])));
    if (Object.keys(siguientesErrores).length > 0) return;

    setGuardando(true);
    setErrorGeneral(null);
    try {
      const payload = normalizarPayloadProductoAdmin(formulario, { esNuevo });
      if (esNuevo) {
        const productoCreado = await crearProductoAdmin(payload);
        navegar(`/admin/productos/${productoCreado.id}/editar`, { replace: true });
      } else {
        await actualizarProductoAdmin(id, payload);
        navegar("/admin/productos");
      }
    } catch (error) {
      setErrorGeneral(error instanceof ErrorAdminApi ? error.message : "No pudimos guardar el producto. Inténtalo nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  if (usuario === undefined) {
    return <main className={styles.estadoPantalla}><p role="status">Comprobando acceso al panel…</p></main>;
  }

  if (errorAcceso) {
    return (
      <main className={styles.estadoPantalla}>
        <section className={styles.estadoContenido} role="alert">
          <h1>No pudimos conectar con el panel</h1>
          <p>{errorAcceso}</p>
          <button type="button" className={styles.botonPrimario} onClick={() => {
            setUsuario(undefined);
            setErrorAcceso(null);
            setIntentoAcceso((actual) => actual + 1);
          }}>Reintentar</button>
        </section>
      </main>
    );
  }

  if (!usuario) return <Navigate to="/admin/acceso" replace />;

  if (cargando) {
    return (
      <EstadoEditor usuario={usuario}>
        <div className={styles.paginaEditor}>
          <div className={styles.estadoContenido} role="status">Cargando editor…</div>
        </div>
      </EstadoEditor>
    );
  }

  if (errorCarga) {
    return (
      <EstadoEditor usuario={usuario}>
        <div className={styles.paginaEditor}>
          <section className={styles.estadoContenido} role="alert">
            <h1>No pudimos abrir el editor</h1>
            <p>{errorCarga}</p>
            <div className={styles.accionesEstado}>
              <Link className={styles.botonSecundario} to="/admin/productos">Volver a productos</Link>
              <button type="button" className={styles.botonPrimario} onClick={() => {
                setCargando(true);
                setErrorCarga(null);
                setIntentoCarga((actual) => actual + 1);
              }}>Reintentar</button>
            </div>
          </section>
        </div>
      </EstadoEditor>
    );
  }

  const nombreProducto = formulario.nombre || (esNuevo ? "Nuevo producto" : "Editar producto");
  const slugVistaPrevia = formulario.slug || "";
  const puedeVerEnTienda = Boolean(slugVistaPrevia) && formulario.estado === "PUBLICADO";

  return (
    <main className={styles.fondoEditor}>
      <AdminShell usuario={usuario}>
        <div className={styles.paginaEditor}>
          <header className={styles.cabeceraEditor}>
          <div>
            <Link className={styles.volver} to="/admin/productos">← Productos</Link>
            <p className={styles.eyebrow}>{esNuevo ? "Nuevo · borrador" : `Editando · SKU ${formulario.sku || "—"}`}</p>
            <h1>{nombreProducto}</h1>
          </div>
          <div className={styles.accionesCabecera}>
            {puedeVerEnTienda ? (
              <a className={styles.botonSecundario} href={`${import.meta.env.BASE_URL}producto/${encodeURIComponent(slugVistaPrevia)}`} target="_blank" rel="noreferrer">Ver en tienda</a>
            ) : <span className={`${styles.botonSecundario} ${styles.botonInactivo}`} title="Se activa cuando el producto está publicado">Ver en tienda</span>}
            <button className={styles.botonPrimario} type="submit" form="formulario-producto" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </header>

        <form id="formulario-producto" className={styles.formulario} onSubmit={guardar} noValidate>
          <section className={styles.superficieEditor} aria-label="Editor de producto">
            <GaleriaProducto
              imagenes={imagenes}
              nombre={nombreProducto}
              productoId={id}
              cargando={cargandoImagen}
              onSubir={subirImagen}
              onReordenar={reordenarImagenes}
              onEliminar={eliminarImagen}
              error={errorGaleria}
            />

            <Campo id="nombre" etiqueta="Nombre" error={tocados.nombre && errores.nombre} requerido>
              {(props) => <input {...props} className={styles.input} type="text" value={formulario.nombre} onChange={cambiar("nombre")} onBlur={() => marcarTocado("nombre")} maxLength="200" />}
            </Campo>

            <div className={styles.filaDos}>
              <Campo id="categoriaId" etiqueta="Categoría" error={tocados.categoriaId && errores.categoriaId} requerido>
                {(props) => (
                  <select {...props} className={styles.input} value={formulario.categoriaId} onChange={cambiarCategoria} onBlur={() => marcarTocado("categoriaId")}>
                    <option value="">Selecciona una categoría</option>
                    {referencias.categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                  </select>
                )}
              </Campo>
              <Campo id="sku" etiqueta="SKU" error={tocados.sku && errores.sku} requerido>
                {(props) => <input {...props} className={styles.input} type="text" value={formulario.sku} onChange={cambiar("sku")} onBlur={() => marcarTocado("sku")} maxLength="80" />}
              </Campo>
            </div>

            <Campo id="subcategoriaId" etiqueta="Subcategoría" ayuda="Opcional. Depende de la categoría elegida (define el mega-menú).">
              {(props) => {
                const disponibles = referencias.subcategorias.filter((s) => s.categoriaId === formulario.categoriaId);
                return (
                  <select
                    {...props}
                    className={styles.input}
                    value={formulario.subcategoriaId}
                    onChange={cambiarSubcategoria}
                    disabled={!formulario.categoriaId || disponibles.length === 0}
                  >
                    <option value="">
                      {!formulario.categoriaId
                        ? "Elige una categoría primero"
                        : disponibles.length === 0
                          ? "Esta categoría no tiene subcategorías"
                          : "Sin subcategoría"}
                    </option>
                    {disponibles.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                );
              }}
            </Campo>

            <Campo id="subcategoriaHijaId" etiqueta="Subcategoría (nivel 3)" ayuda="Opcional. Depende de la subcategoría elegida. Necesaria para que el producto aparezca al filtrar por el tercer nivel del menú.">
              {(props) => {
                const disponibles = referencias.subcategoriasHijas.filter((h) => h.subcategoriaId === formulario.subcategoriaId);
                return (
                  <select
                    {...props}
                    className={styles.input}
                    value={formulario.subcategoriaHijaId}
                    onChange={cambiar("subcategoriaHijaId")}
                    disabled={!formulario.subcategoriaId || disponibles.length === 0}
                  >
                    <option value="">
                      {!formulario.subcategoriaId
                        ? "Elige una subcategoría primero"
                        : disponibles.length === 0
                          ? "Esta subcategoría no tiene tercer nivel"
                          : "Sin tercer nivel"}
                    </option>
                    {disponibles.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                  </select>
                );
              }}
            </Campo>

            <AtributosProducto
              atributos={formulario.categoriaId ? atributosCategoria : []}
              valores={formulario.atributos}
              cargando={cargandoAtributos}
              onCambiar={cambiarAtributo}
            />
            {errorAtributos && <p className={styles.errorCampo} role="alert">{errorAtributos}</p>}

            <div className={styles.filaTres}>
              <Campo id="precio" etiqueta="Precio" error={tocados.precio && errores.precio} requerido>
                {(props) => <input {...props} className={styles.input} type="number" min="0" step="1" value={formulario.precio} onChange={cambiar("precio")} onBlur={() => marcarTocado("precio")} />}
              </Campo>
              <Campo id="precioAnterior" etiqueta="Precio anterior" error={tocados.precioAnterior && errores.precioAnterior} ayuda="Opcional; se muestra como precio de referencia tachado.">
                {(props) => <input {...props} className={styles.input} type="number" min="0" step="1" value={formulario.precioAnterior} onChange={cambiar("precioAnterior")} onBlur={() => marcarTocado("precioAnterior")} />}
              </Campo>
              <Campo id="stock" etiqueta="Stock" error={tocados.stock && errores.stock} requerido>
                {(props) => <input {...props} className={styles.input} type="number" min="0" step="1" value={formulario.stock} onChange={cambiar("stock")} onBlur={() => marcarTocado("stock")} />}
              </Campo>
            </div>

            <Campo id="descripcion" etiqueta="Descripción" error={tocados.descripcion && errores.descripcion} requerido>
              {(props) => <textarea {...props} className={styles.textarea} value={formulario.descripcion} onChange={cambiar("descripcion")} onBlur={() => marcarTocado("descripcion")} maxLength="10000" rows="4" />}
            </Campo>

            <div className={styles.divisor} />

            <section className={styles.detallesCaja} aria-labelledby="titulo-detalles">
              <button
                className={styles.detallesTrigger}
                type="button"
                aria-expanded={detallesAbiertos}
                aria-controls="panel-mas-detalles"
                onClick={() => setDetallesAbiertos((abierto) => !abierto)}
              >
                <span>
                  <strong id="titulo-detalles">Más detalles</strong>
                  <small>Todo lo que la ficha del producto muestra bajo la descripción</small>
                </span>
                <span className={styles.detallesAccion}>{detallesAbiertos ? "Ocultar ↑" : "Mostrar ↓"}</span>
              </button>

              {detallesAbiertos && (
                <div id="panel-mas-detalles" className={styles.detallesPanel}>
                  <div className={styles.filaDos}>
                    <Campo id="marcaId" etiqueta="Marca" error={tocados.marcaId && errores.marcaId}>
                      {(props) => (
                        <select {...props} className={styles.input} value={formulario.marcaId} onChange={cambiar("marcaId")} onBlur={() => marcarTocado("marcaId")}>
                          <option value="">Sin marca</option>
                          {referencias.marcas.map((marca) => <option key={marca.id} value={marca.id}>{marca.nombre}</option>)}
                        </select>
                      )}
                    </Campo>
                    <Campo id="origen" etiqueta="Origen" error={tocados.origen && errores.origen}>
                      {(props) => <input {...props} className={styles.input} type="text" value={formulario.origen} onChange={cambiar("origen")} onBlur={() => marcarTocado("origen")} maxLength="120" />}
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
                          {['g', 'kg', 'ml', 'l', 'un'].map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}
                        </select>
                      )}
                    </Campo>
                    <Campo id="fechaVencimiento" etiqueta="Vence" error={tocados.fechaVencimiento && errores.fechaVencimiento}>
                      {(props) => <input {...props} className={styles.input} type="date" value={formulario.fechaVencimiento} onChange={cambiar("fechaVencimiento")} onBlur={() => marcarTocado("fechaVencimiento")} />}
                    </Campo>
                  </div>

                  <div className={styles.filaDos}>
                    <div className={styles.campoCalculado}>
                      <span>Precio por unidad de medida</span>
                      <strong>{precioPorUnidad ? `$${precioPorUnidad.monto.toLocaleString("es-CL")} por ${precioPorUnidad.unidad === "L" ? "litro" : "kilo"}` : "—"}</strong>
                      <small>Se calcula solo desde contenido y precio</small>
                    </div>
                    <Campo id="pesoDespachoGramos" etiqueta="Peso para despacho" error={tocados.pesoDespachoGramos && errores.pesoDespachoGramos}>
                      {(props) => <input {...props} className={styles.input} type="number" min="1" step="1" value={formulario.pesoDespachoGramos} onChange={cambiar("pesoDespachoGramos")} onBlur={() => marcarTocado("pesoDespachoGramos")} />}
                    </Campo>
                  </div>

                  <div className={styles.filaDos}>
                    <Campo id="codigoBarras" etiqueta="Código de barras" error={tocados.codigoBarras && errores.codigoBarras}>
                      {(props) => <input {...props} className={styles.input} type="text" value={formulario.codigoBarras} onChange={cambiar("codigoBarras")} onBlur={() => marcarTocado("codigoBarras")} maxLength="50" />}
                    </Campo>
                    <div className={styles.grupo}>
                      <label>Etiquetas</label>
                      <div className={styles.etiquetasCampo}>
                        {referencias.etiquetas.map((etiqueta) => (
                          <label className={styles.etiquetaOpcion} key={etiqueta.id}>
                            <input type="checkbox" checked={formulario.etiquetaIds.includes(etiqueta.id)} onChange={() => cambiarValor("etiquetaIds", formulario.etiquetaIds.includes(etiqueta.id) ? formulario.etiquetaIds.filter((idEtiqueta) => idEtiqueta !== etiqueta.id) : [...formulario.etiquetaIds, etiqueta.id])} />
                            <span>{etiqueta.nombre}</span>
                          </label>
                        ))}
                        {referencias.etiquetas.length === 0 && <span className={styles.sinEtiquetas}>Sin etiquetas disponibles</span>}
                      </div>
                    </div>
                  </div>

                  <Campo id="slug" etiqueta="URL del producto" error={tocados.slug && errores.slug} ayuda="Se genera del nombre; editable para SEO (RNF-6)">
                    {(props) => <input {...props} className={styles.input} type="text" value={formulario.slug} onChange={cambiar("slug")} onBlur={() => marcarTocado("slug")} maxLength="180" placeholder="aceite-de-oliva-500ml" />}
                  </Campo>
                </div>
              )}
            </section>

            <div className={styles.divisor} />

            <section className={styles.preferencias} aria-label="Opciones de publicación">
              <Switch id="publicado" etiqueta="Publicado en la tienda" checked={formulario.estado === "PUBLICADO"} disabled={esNuevo} onChange={(activo) => cambiarValor("estado", activo ? "PUBLICADO" : "BORRADOR")} />
              <Switch id="destacado" etiqueta="Destacar en la portada" checked={formulario.destacado} onChange={(activo) => cambiarValor("destacado", activo)} />
              <Switch id="alerta-stock" etiqueta={`Avisar cuando el stock baje de ${formulario.alertaStockBajo || 3} unidades`} checked={Boolean(formulario.alertaStockBajo)} onChange={(activo) => cambiarValor("alertaStockBajo", activo ? (formulario.alertaStockBajo || "3") : "")} />
            </section>
          </section>

          {errorGeneral && (
            <div className={styles.errorGeneral} role="alert">
              <span>{errorGeneral}</span>
              <button type="button" onClick={() => setErrorGeneral(null)}>Cerrar</button>
            </div>
          )}
        </form>
        </div>
      </AdminShell>
    </main>
  );
}
