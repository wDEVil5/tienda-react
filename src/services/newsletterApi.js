const apiUrlPorDefecto = () => import.meta.env.VITE_API_URL;

export class ErrorNewsletterApi extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.status = status;
  }
}

async function solicitarNewsletter(
  ruta,
  {
    method = "GET",
    cuerpo,
    fetchImpl = fetch,
    apiUrl = apiUrlPorDefecto(),
  } = {},
) {
  if (!apiUrl) {
    throw new ErrorNewsletterApi("La conexión a la API no está configurada.", {
      status: 503,
    });
  }

  const opciones = {
    method,
    headers: {},
  };

  if (cuerpo) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  try {
    const respuesta = await fetchImpl(`${apiUrl}${ruta}`, opciones);
    if (!respuesta.ok) {
      let mensajeError = "Error inesperado al contactar con el servidor.";
      try {
        const errorJson = await respuesta.json();
        // El backend responde { error: { code, message } }. Toleramos también la
        // forma antigua { error: "texto" } por si algún endpoint la usa. Si no,
        // meter el objeto en new Error() lo convierte en "[object Object]".
        const detalle = errorJson?.error;
        if (typeof detalle === "string") {
          mensajeError = detalle;
        } else if (detalle?.message) {
          mensajeError = detalle.message;
        }
      } catch {
        // Fallback genérico si no es JSON
      }
      throw new ErrorNewsletterApi(mensajeError, { status: respuesta.status });
    }

    if (respuesta.status === 204) return null;
    return await respuesta.json();
  } catch (error) {
    if (error instanceof ErrorNewsletterApi) throw error;
    throw new ErrorNewsletterApi(
      "No pudimos conectar con el servidor. Revisa tu conexión a internet.",
    );
  }
}

export async function suscribirNewsletter(email, dependencias) {
  return solicitarNewsletter("/api/newsletter", {
    method: "POST",
    cuerpo: { email },
    ...dependencias,
  });
}

export async function bajaNewsletter(token, dependencias) {
  return solicitarNewsletter("/api/newsletter/baja", {
    method: "POST",
    cuerpo: { token },
    ...dependencias,
  });
}
