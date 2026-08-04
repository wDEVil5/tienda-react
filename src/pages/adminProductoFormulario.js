const ESTADOS_PRODUCTO = ["BORRADOR", "PUBLICADO", "ARCHIVADO"];
const UNIDADES_CONTENIDO = ["g", "kg", "ml", "l", "un"];

export const PRODUCTO_FORMULARIO_INICIAL = {
  nombre: "",
  sku: "",
  slug: "",
  descripcion: "",
  precio: "",
  precioAnterior: "",
  stock: "",
  estado: "BORRADOR",
  destacado: false,
  alertaStockBajo: "",
  codigoBarras: "",
  origen: "",
  contenidoCantidad: "",
  contenidoUnidad: "",
  pesoDespachoGramos: "",
  fechaVencimiento: "",
  categoriaId: "",
  marcaId: "",
  etiquetaIds: [],
};

export function crearFormularioProducto(producto = {}) {
  return {
    ...PRODUCTO_FORMULARIO_INICIAL,
    ...producto,
    precio: convertirNumeroAEntrada(producto.precio),
    precioAnterior: convertirNumeroAEntrada(producto.precioAnterior),
    stock: convertirNumeroAEntrada(producto.stock),
    alertaStockBajo: convertirNumeroAEntrada(producto.alertaStockBajo),
    contenidoCantidad: convertirNumeroAEntrada(producto.contenidoCantidad),
    pesoDespachoGramos: convertirNumeroAEntrada(producto.pesoDespachoGramos),
    fechaVencimiento: producto.fechaVencimiento?.slice(0, 10) ?? "",
    categoriaId: producto.categoriaId ?? producto.categoria?.id ?? "",
    marcaId: producto.marcaId ?? producto.marca?.id ?? "",
    etiquetaIds: producto.etiquetaIds ?? producto.etiquetas?.map(({ id }) => id) ?? [],
  };
}

export function validarFormularioProducto(valores, { esNuevo = false } = {}) {
  const errores = {};
  const nombre = String(valores.nombre ?? "").trim();
  const sku = String(valores.sku ?? "").trim();
  const slug = String(valores.slug ?? "").trim();
  const descripcion = String(valores.descripcion ?? "").trim();

  if (nombre.length < 3) errores.nombre = "El nombre debe tener al menos 3 caracteres.";
  if (sku.length < 3) errores.sku = "El SKU debe tener al menos 3 caracteres.";
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errores.slug = "Usa minúsculas, números y guiones, sin espacios.";
  }
  if (!descripcion) errores.descripcion = "Escribe una descripción para el producto.";

  const precio = validarEntero(valores.precio);
  const precioAnterior = validarEnteroOpcional(valores.precioAnterior);
  const alertaStockBajo = validarEnteroPositivoOpcional(valores.alertaStockBajo);
  const contenidoCantidad = validarNumeroPositivoOpcional(valores.contenidoCantidad);
  const pesoDespachoGramos = validarEnteroPositivoOpcional(valores.pesoDespachoGramos);

  if (!esEnteroNoNegativo(valores.precio)) {
    errores.precio = "El precio debe ser un número entero no negativo.";
  }
  if (!esEnteroNoNegativo(valores.stock)) {
    errores.stock = "El stock debe ser un número entero no negativo.";
  }
  if (valores.precioAnterior && precioAnterior === undefined) {
    errores.precioAnterior = "El precio anterior no es válido.";
  }
  if (valores.alertaStockBajo && alertaStockBajo === undefined) {
    errores.alertaStockBajo = "El aviso de stock debe ser mayor que cero.";
  }
  if (valores.contenidoCantidad && contenidoCantidad === undefined) {
    errores.contenidoCantidad = "La cantidad de contenido debe ser mayor que cero.";
  }
  if (valores.pesoDespachoGramos && pesoDespachoGramos === undefined) {
    errores.pesoDespachoGramos = "El peso de despacho debe ser mayor que cero.";
  }

  if (precioAnterior !== null && precioAnterior !== undefined && precio !== null && precioAnterior <= precio) {
    errores.precioAnterior = "Debe ser mayor que el precio actual.";
  }
  if (!valores.categoriaId) errores.categoriaId = "Selecciona una categoría.";
  if (!valores.marcaId) errores.marcaId = "Selecciona una marca.";
  if (valores.estado && !ESTADOS_PRODUCTO.includes(valores.estado)) {
    errores.estado = "Selecciona un estado válido.";
  }
  if (valores.contenidoUnidad && !UNIDADES_CONTENIDO.includes(valores.contenidoUnidad)) {
    errores.contenidoUnidad = "Selecciona una unidad válida.";
  }
  if (valores.fechaVencimiento && !/^\d{4}-\d{2}-\d{2}$/.test(valores.fechaVencimiento)) {
    errores.fechaVencimiento = "Usa una fecha válida.";
  }

  if (esNuevo && valores.estado && valores.estado !== "BORRADOR") {
    errores.estado = "Los productos nuevos comienzan como borrador.";
  }

  if (String(valores.precio ?? "").trim() === "") errores.precio = "El precio es obligatorio.";
  if (String(valores.stock ?? "").trim() === "") errores.stock = "El stock es obligatorio.";

  return errores;
}

export function normalizarPayloadProductoAdmin(valores, { esNuevo = false } = {}) {
  const payload = {
    nombre: String(valores.nombre ?? "").trim(),
    sku: String(valores.sku ?? "").trim(),
    descripcion: String(valores.descripcion ?? "").trim(),
    precio: Number(valores.precio),
    stock: Number(valores.stock),
    categoriaId: valores.categoriaId,
    marcaId: valores.marcaId,
    etiquetaIds: Array.isArray(valores.etiquetaIds) ? valores.etiquetaIds : [],
    destacado: Boolean(valores.destacado),
  };

  const slug = String(valores.slug ?? "").trim();
  if (slug) payload.slug = slug;

  if (!esNuevo && valores.estado) payload.estado = valores.estado;

  agregarTextoOpcional(payload, "codigoBarras", valores.codigoBarras, esNuevo);
  agregarTextoOpcional(payload, "origen", valores.origen, esNuevo);
  agregarNumeroOpcional(payload, "precioAnterior", valores.precioAnterior, esNuevo);
  agregarNumeroOpcional(payload, "contenidoCantidad", valores.contenidoCantidad, esNuevo);
  agregarTextoOpcional(payload, "contenidoUnidad", valores.contenidoUnidad, esNuevo);
  agregarNumeroOpcional(payload, "pesoDespachoGramos", valores.pesoDespachoGramos, esNuevo);
  agregarNumeroOpcional(payload, "alertaStockBajo", valores.alertaStockBajo, esNuevo);
  agregarFechaOpcional(payload, "fechaVencimiento", valores.fechaVencimiento, esNuevo);

  return payload;
}

function convertirNumeroAEntrada(valor) {
  return valor === null || valor === undefined ? "" : String(valor);
}

function validarEntero(valor) {
  if (String(valor ?? "").trim() === "") return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

function validarEnteroOpcional(valor) {
  if (String(valor ?? "").trim() === "") return undefined;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 ? numero : undefined;
}

function validarEnteroPositivoOpcional(valor) {
  if (String(valor ?? "").trim() === "") return undefined;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
}

function validarNumeroPositivoOpcional(valor) {
  if (String(valor ?? "").trim() === "") return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : undefined;
}

function esEnteroNoNegativo(valor) {
  if (String(valor ?? "").trim() === "") return false;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0;
}

function agregarTextoOpcional(payload, campo, valor, esNuevo) {
  const texto = String(valor ?? "").trim();
  if (texto) payload[campo] = texto;
  else if (!esNuevo) payload[campo] = null;
}

function agregarNumeroOpcional(payload, campo, valor, esNuevo) {
  const texto = String(valor ?? "").trim();
  if (texto) payload[campo] = Number(valor);
  else if (!esNuevo) payload[campo] = null;
}

function agregarFechaOpcional(payload, campo, valor, esNuevo) {
  if (valor) payload[campo] = valor;
  else if (!esNuevo) payload[campo] = null;
}
