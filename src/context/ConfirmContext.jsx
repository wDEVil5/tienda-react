import { createContext, useCallback, useContext, useRef, useState } from "react";
import DialogoConfirmacion from "../components/DialogoConfirmacion.jsx";

const ConfirmContext = createContext(null);

// Acepta un string (mensaje) o un objeto con opciones. Rellena los textos por
// defecto para que cada llamada solo pase lo que quiere personalizar.
function normalizarOpciones(opciones) {
  const base = typeof opciones === "string" ? { mensaje: opciones } : (opciones ?? {});
  return {
    titulo: base.titulo ?? "¿Confirmar?",
    mensaje: base.mensaje ?? "",
    textoConfirmar: base.textoConfirmar ?? "Confirmar",
    textoCancelar: base.textoCancelar ?? "Cancelar",
    peligro: base.peligro ?? false,
  };
}

// Reemplaza a window.confirm por un diálogo propio. `confirmar(...)` devuelve una
// promesa que resuelve true/false; así el call site casi no cambia respecto al nativo.
export function ConfirmProvider({ children }) {
  const [opciones, setOpciones] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback((entrada) => {
    return new Promise((resolver) => {
      resolverRef.current = resolver;
      setOpciones(normalizarOpciones(entrada));
    });
  }, []);

  // Cerramos y resolvemos fuera del updater de estado (sin efectos en el render).
  const responder = useCallback((valor) => {
    setOpciones(null);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(valor);
  }, []);

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {opciones && (
        <DialogoConfirmacion
          {...opciones}
          onConfirmar={() => responder(true)}
          onCancelar={() => responder(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const confirmar = useContext(ConfirmContext);
  if (confirmar === null) {
    throw new Error("useConfirm debe usarse dentro de un <ConfirmProvider>.");
  }
  return confirmar;
}
