// Marcas gestionadas técnicamente dentro del proyecto. Los archivos viven en
// public/marcas para que Vite los sirva como recursos estáticos y BASE_URL haga
// que las rutas funcionen también si la app se publica dentro de un subpath.
const rutaLogoLocal = (archivo) =>
  archivo ? `${import.meta.env.BASE_URL}marcas/${archivo}` : null;

const crearMarca = (orden, nombre = `Marca ${String(orden).padStart(2, "0")}`, archivoLogo = null) => ({
  id: `marca-${String(orden).padStart(2, "0")}`,
  nombre,
  activo: true,
  orden,
  archivoLogo,
});

// Al tener los logos, cambia una fila por ejemplo a:
// crearMarca(1, "Coca-Cola", "coca-cola.svg")
const MARCAS = [
  crearMarca(1),
  crearMarca(2),
  crearMarca(3),
  crearMarca(4),
  crearMarca(5),
  crearMarca(6),
  crearMarca(7),
  crearMarca(8),
  crearMarca(9),
  crearMarca(10),
  crearMarca(11),
  crearMarca(12),
];

// El carrusel recibe siempre la misma forma que esperaría una futura API.
// Para agregar una marca: id único, nombre, orden, activo y archivoLogo.
export const marcasActivas = MARCAS.filter((marca) => marca.activo)
  .sort((a, b) => a.orden - b.orden)
  .map((marca) => ({
    ...marca,
    logoUrl: rutaLogoLocal(marca.archivoLogo),
  }));
