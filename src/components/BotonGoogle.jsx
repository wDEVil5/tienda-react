import { useEffect, useRef, useState } from "react";
import styles from "./BotonGoogle.module.css";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const URL_GIS = "https://accounts.google.com/gsi/client";

// Carga el script de Google Identity Services una sola vez para toda la app. Se
// memoriza la promesa: montajes posteriores reutilizan la misma carga.
let promesaScript = null;
function cargarScriptGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (promesaScript) return promesaScript;

  promesaScript = new Promise((resolver, rechazar) => {
    const script = document.createElement("script");
    script.src = URL_GIS;
    script.async = true;
    script.defer = true;
    script.onload = () => resolver();
    script.onerror = () => {
      promesaScript = null; // permitir reintento en el próximo montaje
      rechazar(new Error("No se pudo cargar Google Identity Services."));
    };
    document.head.appendChild(script);
  });
  return promesaScript;
}

// Botón oficial de "Iniciar con Google". Google lo renderiza dentro de un iframe,
// por eso su interior no se puede estilar: solo controlamos el contenedor. Al
// elegir cuenta, Google entrega un ID token (JWT) que se pasa por `onCredencial`.
// `texto` mapea al copy oficial permitido ("continue_with"/"signup_with").
export default function BotonGoogle({ onCredencial, onError, texto = "continue_with" }) {
  const contenedor = useRef(null);
  // Guardamos el handler en un ref: el callback de Google vive fuera de React y
  // debe llamar siempre a la última versión sin re-inicializar el widget.
  const alRecibir = useRef(onCredencial);
  // El callback de Google vive fuera de React; mantenemos el ref al día en un
  // efecto (no en el render) para llamar siempre a la última versión.
  useEffect(() => {
    alRecibir.current = onCredencial;
  }, [onCredencial]);
  // Sin Client ID no hay nada que cargar: el estado inicial ya es "error" (estado
  // derivado, sin setState en el efecto). Con él, arranca en "cargando".
  const [estado, setEstado] = useState(CLIENT_ID ? "cargando" : "error");

  useEffect(() => {
    if (!CLIENT_ID) return;

    let vigente = true;
    cargarScriptGoogle()
      .then(() => {
        if (!vigente || !contenedor.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (respuesta) => alRecibir.current?.(respuesta.credential),
        });
        window.google.accounts.id.renderButton(contenedor.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: texto,
          logo_alignment: "center",
          width: 320,
        });
        setEstado("listo");
      })
      .catch((error) => {
        if (!vigente) return;
        setEstado("error");
        onError?.(error);
      });

    return () => {
      vigente = false;
    };
    // onError/texto son estables en la práctica; onCredencial va por ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado === "error") {
    return (
      <button
        type="button"
        className={styles.fallback}
        disabled
        title="El acceso con Google no está disponible en este momento."
      >
        <span className={styles.fallbackIcono}>G</span>
        Google no disponible
      </button>
    );
  }

  return (
    <div className={styles.contenedor}>
      <div ref={contenedor} className={styles.boton} />
      {estado === "cargando" && (
        <span className={styles.cargando} role="status">
          Cargando Google…
        </span>
      )}
    </div>
  );
}
