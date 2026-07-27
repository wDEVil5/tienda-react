import Hero from "../components/Hero.jsx";
import TiraConfianza from "../components/TiraConfianza.jsx";
import Categorias from "../components/Categorias.jsx";
import Catalogo from "../components/Catalogo.jsx";

// Página de inicio: compone las secciones del Home en orden. Falta por agregar
// la banda de ofertas entre categorías y el catálogo.
function Home({ productos, busqueda }) {
  return (
    <>
      <Hero />
      <TiraConfianza />
      <Categorias productos={productos} />
      <Catalogo productos={productos} busqueda={busqueda} />
    </>
  );
}

export default Home;
