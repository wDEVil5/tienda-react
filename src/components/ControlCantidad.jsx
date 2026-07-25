import { useState } from "react";
import styles from "./ControlCantidad.module.css";

// Control de cantidad editable: botones − / + y un input donde se puede escribir.
// Es su PROPIO componente porque cada fila del carrito necesita su estado local
// de edición, y los hooks no pueden llamarse dentro de un .map().
function ControlCantidad({ cantidad, onDisminuir, onAumentar, onFijar }) {
  // Estado local del texto del input. Permite valores intermedios mientras se
  // escribe (incluido el campo vacío). La verdad final sigue viviendo en el carrito.
  const [valor, setValor] = useState(String(cantidad));

  // Si la cantidad cambia desde AFUERA (botones − / +), reflejamos el nuevo valor
  // en el input. Patrón "ajustar estado en render" comparando con el anterior
  // (el mismo que resetea la paginación en Catalogo.jsx), sin useEffect.
  const [cantidadPrevia, setCantidadPrevia] = useState(cantidad);
  if (cantidad !== cantidadPrevia) {
    setCantidadPrevia(cantidad);
    setValor(String(cantidad));
  }

  // Al salir del input o presionar Enter, confirmamos: entero >= 1, o descartamos
  // volviendo al valor real del carrito (p. ej. si quedó vacío o inválido).
  const confirmar = () => {
    const n = parseInt(valor, 10);
    if (Number.isNaN(n) || n < 1) {
      setValor(String(cantidad));
    } else {
      onFijar(n);
    }
  };

  return (
    <div className={styles.control}>
      <button
        className={styles.boton}
        onClick={onDisminuir}
        aria-label="Disminuir cantidad"
      >
        −
      </button>
      <input
        className={styles.input}
        type="text"
        inputMode="numeric"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label="Cantidad"
      />
      <button
        className={styles.boton}
        onClick={onAumentar}
        aria-label="Aumentar cantidad"
      >
        +
      </button>
    </div>
  );
}

export default ControlCantidad;
