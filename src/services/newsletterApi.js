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
        if (errorJson && errorJson.error) {
          mensajeError = errorJson.error;
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
