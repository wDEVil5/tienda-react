import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "prisma/config";
import {
  EstadoPedido,
  EstadoProducto,
  ModalidadEntrega,
  PrismaClient,
} from "../src/generated/prisma/client";
import { normalizarTextoBusqueda } from "../src/lib/texto.js";
import {
  calcularCostoEnvio,
  REGLAS_POR_DEFECTO,
} from "../src/lib/reglasTienda.js";
import { crearHashContrasena } from "../src/modules/auth/contrasena.js";

// El seed representa un catálogo mínimo de desarrollo. No es la fuente de
// verdad del negocio ni reemplaza el futuro panel de administración.
const catalogoInicial = [
  {
    sku: "ACE-OLIVA-500",
    slug: "aceite-oliva-extra-virgen-500-ml",
    nombre: "Aceite de oliva extra virgen 500 ml",
    descripcion: "Aceite prensado en frío, ideal para ensaladas y preparaciones.",
    precio: 7990,
    precioAnterior: 10653,
    stock: 12,
    estado: EstadoProducto.PUBLICADO,
    destacado: true,
    origen: "Valle de Colchagua",
    contenidoCantidad: 500,
    contenidoUnidad: "ml",
    pesoDespachoGramos: 700,
    fechaVencimiento: new Date("2027-01-31T00:00:00.000Z"),
    etiquetas: ["Vegano", "Sin gluten"],
    categoria: { nombre: "Despensa", slug: "despensa" },
    marca: { nombre: "Valle Oliva", slug: "valle-oliva" },
    imagenes: [
      {
        url: "https://placehold.co/600x600/f3f0ea/1b1b18?text=Aceite+de+oliva",
        textoAlternativo: "Aceite de oliva extra virgen de 500 ml",
        orden: 1,
      },
    ],
  },
  {
    sku: "CAFE-GRANO-250",
    slug: "cafe-de-grano-tostado-250-g",
    nombre: "Café de grano tostado 250 g",
    descripcion: "Café de tueste medio, en grano, con notas de chocolate.",
    precio: 5490,
    precioAnterior: null,
    stock: 25,
    estado: EstadoProducto.PUBLICADO,
    destacado: true,
    contenidoCantidad: 250,
    contenidoUnidad: "g",
    pesoDespachoGramos: 300,
    fechaVencimiento: new Date("2027-03-31T00:00:00.000Z"),
    etiquetas: ["Vegano"],
    categoria: { nombre: "Despensa", slug: "despensa" },
    marca: { nombre: "Café del Barrio", slug: "cafe-del-barrio" },
    imagenes: [
      {
        url: "https://placehold.co/600x600/f3f0ea/1b1b18?text=Cafe+en+grano",
        textoAlternativo: "Bolsa de café de grano tostado de 250 g",
        orden: 1,
      },
    ],
  },
  {
    sku: "LECHE-ENTERA-1L",
    slug: "leche-entera-1-l",
    nombre: "Leche entera 1 L",
    descripcion: "Leche entera larga vida, ideal para el consumo diario.",
    precio: 4290,
    precioAnterior: 5720,
    stock: 8,
    estado: EstadoProducto.PUBLICADO,
    destacado: false,
    contenidoCantidad: 1,
    contenidoUnidad: "L",
    pesoDespachoGramos: 1100,
    fechaVencimiento: new Date("2026-10-15T00:00:00.000Z"),
    etiquetas: ["Lácteos"],
    categoria: { nombre: "Lácteos", slug: "lacteos" },
    marca: { nombre: "Campo Sur", slug: "campo-sur" },
    imagenes: [
      {
        url: "https://placehold.co/600x600/f3f0ea/1b1b18?text=Leche+entera",
        textoAlternativo: "Caja de leche entera de un litro",
        orden: 1,
      },
    ],
  },
  {
    sku: "DETERGENTE-LIQ-3L",
    slug: "detergente-liquido-concentrado-3-l",
    nombre: "Detergente líquido concentrado 3 L",
    descripcion: "Detergente concentrado para ropa, rendimiento aproximado de 50 lavados.",
    precio: 8990,
    precioAnterior: null,
    stock: 5,
    estado: EstadoProducto.PUBLICADO,
    destacado: false,
    contenidoCantidad: 3,
    contenidoUnidad: "L",
    pesoDespachoGramos: 3200,
    alertaStockBajo: 3,
    etiquetas: ["Hogar"],
    categoria: { nombre: "Limpieza", slug: "limpieza" },
    marca: { nombre: "Hogar Claro", slug: "hogar-claro" },
    imagenes: [
      {
        url: "https://placehold.co/600x600/f3f0ea/1b1b18?text=Detergente",
        textoAlternativo: "Envase de detergente líquido concentrado de tres litros",
        orden: 1,
      },
    ],
  },
  {
    sku: "QUESO-MANT-250",
    slug: "queso-mantecoso-laminado-250-g",
    nombre: "Queso mantecoso laminado 250 g",
    descripcion: "Queso mantecoso laminado para sandwiches y preparaciones.",
    precio: 3690,
    precioAnterior: null,
    stock: 0,
    estado: EstadoProducto.PUBLICADO,
    destacado: false,
    contenidoCantidad: 250,
    contenidoUnidad: "g",
    pesoDespachoGramos: 300,
    alertaStockBajo: 4,
    fechaVencimiento: new Date("2026-08-20T00:00:00.000Z"),
    etiquetas: ["Sin gluten"],
    categoria: { nombre: "Lácteos", slug: "lacteos" },
    marca: { nombre: "Campo Sur", slug: "campo-sur" },
    imagenes: [
      {
        url: "https://placehold.co/600x600/f3f0ea/1b1b18?text=Queso+mantecoso",
        textoAlternativo: "Queso mantecoso laminado de 250 g",
        orden: 1,
      },
    ],
  },
  {
    sku: "MERMELADA-FRUT-250",
    slug: "mermelada-de-frutilla-250-g",
    nombre: "Mermelada de frutilla 250 g",
    descripcion: "Mermelada de frutilla para desayunos y repostería.",
    precio: 2990,
    precioAnterior: null,
    stock: 16,
    estado: EstadoProducto.BORRADOR,
    destacado: false,
    contenidoCantidad: 250,
    contenidoUnidad: "g",
    pesoDespachoGramos: 400,
    etiquetas: ["Vegano", "Sin gluten"],
    categoria: { nombre: "Despensa", slug: "despensa" },
    marca: { nombre: "Dulce Casa", slug: "dulce-casa" },
    imagenes: [
      {
        url: "https://placehold.co/600x600/f3f0ea/1b1b18?text=Mermelada",
        textoAlternativo: "Frasco de mermelada de frutilla de 250 g",
        orden: 1,
      },
    ],
  },
];

const ofertaSemanalDesarrollo = {
  slug: "ofertas-semana-desarrollo",
  nombre: "Ofertas de la semana",
  porcentajeDescuento: 25,
  productosSku: ["ACE-OLIVA-500", "LECHE-ENTERA-1L"],
};

// Pedidos de ejemplo para probar "Mis pedidos" y el panel del dueño sin comprar
// a mano. Ids fijos para que el seed sea repetible (upsert). `historial` define
// la línea de tiempo: cada estado con cuántas horas atrás ocurrió; el estado
// actual es el último de la lista. NOTA: estos pedidos son registros ilustrativos
// y NO mueven stock/stockReservado (eso lo maneja el servicio transaccional).
const pedidosIniciales = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    modalidad: ModalidadEntrega.RETIRO,
    contacto: {
      nombre: "Wilnes A.",
      email: "wilnes@correo.cl",
      telefono: "+56 9 1234 5678",
    },
    direccion: null,
    lineas: [
      { sku: "ACE-OLIVA-500", cantidad: 2 },
      { sku: "CAFE-GRANO-250", cantidad: 1 },
    ],
    historial: [
      { estado: EstadoPedido.PENDIENTE, horasAtras: 72 },
      { estado: EstadoPedido.PREPARANDO, horasAtras: 70 },
      { estado: EstadoPedido.LISTO_PARA_RETIRO, horasAtras: 48 },
      { estado: EstadoPedido.ENTREGADO, horasAtras: 44 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    modalidad: ModalidadEntrega.DESPACHO,
    contacto: {
      nombre: "Camila R.",
      email: "camila@correo.cl",
      telefono: "+56 9 8765 4321",
    },
    direccion: {
      calle: "Av. Providencia 1234",
      depto: "Depto 501",
      comuna: "Providencia",
      region: "Región Metropolitana",
      instrucciones: "Dejar en conserjería",
    },
    lineas: [
      { sku: "LECHE-ENTERA-1L", cantidad: 1 },
      { sku: "DETERGENTE-LIQ-3L", cantidad: 1 },
    ],
    historial: [{ estado: EstadoPedido.PENDIENTE, horasAtras: 3 }],
  },
];

const adapter = new PrismaPg({ connectionString: env("DATABASE_URL") });
const prisma = new PrismaClient({ adapter });

function crearSlugEtiqueta(nombre: string) {
  return normalizarTextoBusqueda(nombre)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function sembrarCatalogo() {
  for (const item of catalogoInicial) {
    await prisma.categoria.upsert({
      where: { slug: item.categoria.slug },
      update: { nombre: item.categoria.nombre, activa: true },
      create: item.categoria,
    });

    await prisma.marca.upsert({
      where: { slug: item.marca.slug },
      update: { nombre: item.marca.nombre },
      create: item.marca,
    });

    const conexionesEtiquetas = await Promise.all(
      item.etiquetas.map(async (nombre) => {
        const slug = crearSlugEtiqueta(nombre);
        await prisma.etiqueta.upsert({
          where: { slug },
          update: { nombre },
          create: { nombre, slug },
        });

        return { slug };
      }),
    );
    const relacionesEtiquetas = conexionesEtiquetas.map((etiqueta) => ({
      etiqueta: { connect: etiqueta },
    }));

    const datosProducto = {
      sku: item.sku,
      slug: item.slug,
      nombre: item.nombre,
      nombreBusqueda: normalizarTextoBusqueda(item.nombre),
      descripcion: item.descripcion,
      precio: item.precio,
      precioAnterior: item.precioAnterior,
      stock: item.stock,
      estado: item.estado,
      destacado: item.destacado,
      alertaStockBajo: item.alertaStockBajo ?? null,
      origen: item.origen ?? null,
      contenidoCantidad: item.contenidoCantidad,
      contenidoUnidad: item.contenidoUnidad,
      pesoDespachoGramos: item.pesoDespachoGramos,
      fechaVencimiento: item.fechaVencimiento ?? null,
      categoria: { connect: { slug: item.categoria.slug } },
      marca: { connect: { slug: item.marca.slug } },
    };

    await prisma.producto.upsert({
      where: { sku: item.sku },
      create: {
        ...datosProducto,
        imagenes: { create: item.imagenes },
        etiquetas: { create: relacionesEtiquetas },
      },
      update: {
        ...datosProducto,
        // Reemplaza la galería declarada para que el seed siga siendo repetible.
        imagenes: {
          deleteMany: {},
          create: item.imagenes,
        },
        etiquetas: {
          deleteMany: {},
          create: relacionesEtiquetas,
        },
      },
    });
  }
}

async function sembrarOfertaSemanal() {
  const ahora = new Date();
  const empiezaEn = new Date(ahora);
  const terminaEn = new Date(ahora);

  // El rango móvil mantiene disponible esta campaña únicamente en desarrollo.
  empiezaEn.setUTCDate(empiezaEn.getUTCDate() - 1);
  terminaEn.setUTCDate(terminaEn.getUTCDate() + 7);

  const promocion = await prisma.promocion.upsert({
    where: { slug: ofertaSemanalDesarrollo.slug },
    update: {
      nombre: ofertaSemanalDesarrollo.nombre,
      porcentajeDescuento: ofertaSemanalDesarrollo.porcentajeDescuento,
      empiezaEn,
      terminaEn,
      activa: true,
    },
    create: {
      nombre: ofertaSemanalDesarrollo.nombre,
      slug: ofertaSemanalDesarrollo.slug,
      porcentajeDescuento: ofertaSemanalDesarrollo.porcentajeDescuento,
      empiezaEn,
      terminaEn,
    },
  });

  const productosEnOferta = await prisma.producto.findMany({
    where: { sku: { in: ofertaSemanalDesarrollo.productosSku } },
    select: { id: true },
  });

  // El seed es una fuente controlada de desarrollo: sincroniza exactamente la
  // selección declarada, sin afectar la futura administración de producción.
  await prisma.promocionProducto.deleteMany({
    where: { promocionId: promocion.id },
  });
  await prisma.promocionProducto.createMany({
    data: productosEnOferta.map((producto) => ({
      promocionId: promocion.id,
      productoId: producto.id,
    })),
  });
}

async function sembrarPedidos() {
  for (const pedido of pedidosIniciales) {
    // Se traen los productos para CONGELAR sus datos como snapshot en el ítem.
    const productos = await prisma.producto.findMany({
      where: { sku: { in: pedido.lineas.map((linea) => linea.sku) } },
      select: { id: true, sku: true, nombre: true, precio: true, precioAnterior: true },
    });
    const porSku = new Map(productos.map((producto) => [producto.sku, producto]));

    const items = pedido.lineas.map((linea) => {
      const producto = porSku.get(linea.sku);
      if (!producto) {
        throw new Error(`Seed de pedidos: falta el producto ${linea.sku}`);
      }

      // precio = valor final; precioAnterior = normal tachado (o el final si no hay oferta).
      const precioFinal = producto.precio;
      const precioNormal = producto.precioAnterior ?? producto.precio;
      return {
        productoId: producto.id,
        nombre: producto.nombre,
        sku: producto.sku,
        precioNormal,
        precioFinal,
        cantidad: linea.cantidad,
        subtotal: precioFinal * linea.cantidad,
      };
    });

    // Totales: subtotal a precio NORMAL, descuento acumulado y envío por reglas.
    const subtotal = items.reduce(
      (suma, item) => suma + item.precioNormal * item.cantidad,
      0,
    );
    const descuento = items.reduce(
      (suma, item) => suma + (item.precioNormal - item.precioFinal) * item.cantidad,
      0,
    );
    const costoEnvio = calcularCostoEnvio({
      modalidad: pedido.modalidad,
      comuna: pedido.direccion?.comuna,
      subtotal,
    });
    const total = subtotal - descuento + costoEnvio;

    const ahora = Date.now();
    const eventos = pedido.historial.map((evento) => ({
      estado: evento.estado,
      createdAt: new Date(ahora - evento.horasAtras * 60 * 60 * 1000),
    }));
    const estado = pedido.historial[pedido.historial.length - 1].estado;

    const datosPedido = {
      // Los pedidos de ejemplo pertenecen al cliente demo, para poblar su
      // historial (/api/cuenta/pedidos). El cliente se siembra antes.
      clienteId: CLIENTE_DEMO_ID,
      estado,
      modalidad: pedido.modalidad,
      contactoNombre: pedido.contacto.nombre,
      contactoEmail: pedido.contacto.email,
      contactoTelefono: pedido.contacto.telefono,
      dirCalle: pedido.direccion?.calle ?? null,
      dirDepto: pedido.direccion?.depto ?? null,
      dirComuna: pedido.direccion?.comuna ?? null,
      dirRegion: pedido.direccion?.region ?? null,
      dirInstrucciones: pedido.direccion?.instrucciones ?? null,
      subtotal,
      descuento,
      costoEnvio,
      total,
    };

    await prisma.pedido.upsert({
      where: { id: pedido.id },
      create: {
        id: pedido.id,
        ...datosPedido,
        items: { create: items },
        eventos: { create: eventos },
      },
      // Repetible: reemplaza líneas y eventos declarados en cada corrida.
      update: {
        ...datosPedido,
        items: { deleteMany: {}, create: items },
        eventos: { deleteMany: {}, create: eventos },
      },
    });
  }
}

// Reglas comerciales base. En re-seed usa `update: {}` para NO pisar lo que el
// dueño haya editado desde el panel: el seed solo garantiza que exista una
// configuración inicial y las comunas por defecto.
async function sembrarReglas() {
  const { tarifasComuna, ...configuracion } = REGLAS_POR_DEFECTO;

  await prisma.configuracionTienda.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...configuracion },
    update: {},
  });

  for (const tarifa of tarifasComuna) {
    await prisma.tarifaComuna.upsert({
      where: { comuna: tarifa.comuna },
      create: tarifa,
      update: {},
    });
  }
}

// Cuenta de cliente de ejemplo para probar login, direcciones e historial. Id
// fijo (repetible). En re-seed no se pisa la contraseña, por si se cambió desde
// la app durante pruebas.
const CLIENTE_DEMO_ID = "11111111-1111-4111-8111-111111111111";

async function sembrarCliente() {
  const email = "cliente@sumarketexpress.cl";
  const passwordHash = await crearHashContrasena("Cliente2026!");

  await prisma.cliente.upsert({
    where: { email },
    create: {
      id: CLIENTE_DEMO_ID,
      nombre: "Wilnes A.",
      email,
      passwordHash,
      telefono: "+56 9 1234 5678",
    },
    update: { nombre: "Wilnes A.", telefono: "+56 9 1234 5678", activo: true },
  });
}

try {
  await sembrarCatalogo();
  await sembrarOfertaSemanal();
  await sembrarCliente(); // antes de los pedidos: estos se enlazan a su cuenta
  await sembrarPedidos();
  await sembrarReglas();
  console.info(
    `Seed completado: ${catalogoInicial.length} productos, ${pedidosIniciales.length} pedidos, las reglas de la tienda y una cuenta de cliente de ejemplo.`,
  );
} finally {
  await prisma.$disconnect();
}
