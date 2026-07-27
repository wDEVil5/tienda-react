import Hero from "../components/Hero.jsx";
import Catalogo from "../components/Catalogo.jsx";

// Página de inicio: compone las secciones del Home en orden. Se irán agregando
// tira de confianza, categorías y banda de ofertas entre el héroe y el catálogo.
function Home({ productos, busqueda }) {
  return (
    <>
      <Hero />
      <Catalogo productos={productos} busqueda={busqueda} />
    </>
  );
}

export default Home;
