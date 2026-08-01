import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "prisma/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizarTextoBusqueda } from "../src/lib/texto.js";

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
    activo: true,
    destacado: true,
    origen: "Valle de Colchagua",
    contenidoCantidad: 500,
    contenidoUnidad: "ml",
    pesoDespachoGramos: 700,
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
    activo: true,
    destacado: true,
    contenidoCantidad: 250,
    contenidoUnidad: "g",
    pesoDespachoGramos: 300,
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
    activo: true,
    destacado: false,
    contenidoCantidad: 1,
    contenidoUnidad: "L",
    pesoDespachoGramos: 1100,
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
    activo: true,
    destacado: false,
    contenidoCantidad: 3,
    contenidoUnidad: "L",
    pesoDespachoGramos: 3200,
    alertaStockBajo: 3,
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
    activo: true,
    destacado: false,
    contenidoCantidad: 250,
    contenidoUnidad: "g",
    pesoDespachoGramos: 300,
    alertaStockBajo: 4,
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
    activo: false,
    destacado: false,
    contenidoCantidad: 250,
    contenidoUnidad: "g",
    pesoDespachoGramos: 400,
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

const adapter = new PrismaPg({ connectionString: env("DATABASE_URL") });
const prisma = new PrismaClient({ adapter });

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

    const datosProducto = {
      sku: item.sku,
      slug: item.slug,
      nombre: item.nombre,
      nombreBusqueda: normalizarTextoBusqueda(item.nombre),
      descripcion: item.descripcion,
      precio: item.precio,
      precioAnterior: item.precioAnterior,
      stock: item.stock,
      activo: item.activo,
      destacado: item.destacado,
      alertaStockBajo: item.alertaStockBajo ?? null,
      origen: item.origen ?? null,
      contenidoCantidad: item.contenidoCantidad,
      contenidoUnidad: item.contenidoUnidad,
      pesoDespachoGramos: item.pesoDespachoGramos,
      categoria: { connect: { slug: item.categoria.slug } },
      marca: { connect: { slug: item.marca.slug } },
    };

    await prisma.producto.upsert({
      where: { sku: item.sku },
      create: {
        ...datosProducto,
        imagenes: { create: item.imagenes },
      },
      update: {
        ...datosProducto,
        // Reemplaza la galería declarada para que el seed siga siendo repetible.
        imagenes: {
          deleteMany: {},
          create: item.imagenes,
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

try {
  await sembrarCatalogo();
  await sembrarOfertaSemanal();
  console.info(`Seed completado: ${catalogoInicial.length} productos procesados.`);
} finally {
  await prisma.$disconnect();
}
