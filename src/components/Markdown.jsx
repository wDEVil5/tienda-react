import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Render de Markdown seguro: react-markdown NO interpreta HTML crudo (no usamos
// rehype-raw), así que el contenido editable no puede inyectar scripts. remark-gfm
// añade tablas, listas de tareas y autolinks. Se reutiliza en el editor (vista
// previa) y en la página pública.
export default function Markdown({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}
