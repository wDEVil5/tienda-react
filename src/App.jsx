import { productos } from "./data/producto.js";
import Catalogo from "./components/Catalogo.jsx";

function App() {
    return (
        <div>
            <h1>SumarketExpress</h1>
            <Catalogo productos = {productos} />
        </div>
    )
}

export default App;
