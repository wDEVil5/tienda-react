// Sistema de plantillas de correo de SumarketExpress.
//
// Todo el HTML se arma con tablas y estilos en línea sobre los "safe" de email:
// los clientes (Gmail, Apple Mail, Outlook) descartan gran parte del CSS de <head>,
// así que los estilos que DEBEN sobrevivir (botones, cajas) van inline. Los colores
// espejan los design tokens de la tienda para que el correo se sienta parte de la
// misma marca.

const COLOR = {
  acento: '#2f6b4a',
  acentoOscuro: '#255a3d',
  acentoBg: '#e6efe8',
  fondo: '#fbfaf7',
  superficie: '#ffffff',
  crudo: '#f4f2ec',
  texto: '#1c1b18',
  textoSuave: '#6f6d64',
  textoTenue: '#9a978d',
  borde: '#e3e0d7',
}

// Botón "bulletproof": el ancla lleva TODO su estilo en línea (padding, color,
// radio) para no depender del <style> del head, y va centrado por una tabla.
export function botonHTML({ href, texto, variante = 'primario' }) {
  const estilos = {
    primario: `background-color:${COLOR.acento};color:#ffffff;border:1px solid ${COLOR.acento};`,
    secundario: `background-color:${COLOR.superficie};color:${COLOR.acento};border:1px solid #cdd7cd;`,
  }
  const estilo = estilos[variante] ?? estilos.primario
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:6px auto 4px;">
      <tr>
        <td align="center" style="border-radius:10px;">
          <a href="${href}" target="_blank" style="display:inline-block;padding:13px 30px;border-radius:10px;font-size:15px;font-weight:600;line-height:1;text-decoration:none;${estilo}">${texto}</a>
        </td>
      </tr>
    </table>`
}

// Caja de aviso con borde de acento a la izquierda. `tono` decide el color:
// neutro (nota), seguridad (advertencia), exito (buenas noticias).
export function calloutHTML({ contenido, tono = 'neutro' }) {
  const tonos = {
    neutro: `background-color:${COLOR.crudo};border-left:3px solid #cfc9ba;color:#4a4740;`,
    seguridad: 'background-color:#fbf4e6;border-left:3px solid #c99a3b;color:#6b5324;',
    exito: `background-color:${COLOR.acentoBg};border-left:3px solid ${COLOR.acento};color:${COLOR.acentoOscuro};`,
  }
  const estilo = tonos[tono] ?? tonos.neutro
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;">
      <tr>
        <td style="padding:14px 16px;border-radius:8px;font-size:14px;line-height:1.55;${estilo}">${contenido}</td>
      </tr>
    </table>`
}

// Píldora de metadato (ej. "#SE-1043", "Despacho"). Se usan en fila bajo el título.
export function chipHTML(texto) {
  return `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 12px;border-radius:999px;background-color:${COLOR.acentoBg};color:${COLOR.acentoOscuro};font-size:13px;font-weight:600;">${texto}</span>`
}

export function plantillaBaseHTML({ titulo, preheader = '', contenido }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${titulo}</title>
  <style>
    body { margin:0; padding:0; width:100%; background-color:${COLOR.fondo}; -webkit-font-smoothing:antialiased; }
    .fuente { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
    a { color:${COLOR.acento}; }
    .wrapper { width:100%; background-color:${COLOR.fondo}; padding:36px 12px; }
    .main { width:100%; max-width:600px; margin:0 auto; background-color:${COLOR.superficie}; border:1px solid ${COLOR.borde}; border-radius:16px; overflow:hidden; }
    .barra-acento { height:4px; background-color:${COLOR.acento}; line-height:4px; font-size:0; }
    .header { padding:28px 40px 24px; text-align:center; border-bottom:1px solid ${COLOR.borde}; }
    .brand { font-size:22px; font-weight:800; letter-spacing:-0.02em; color:${COLOR.texto}; }
    .brand span { color:${COLOR.acento}; }
    .tagline { margin-top:4px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:${COLOR.textoTenue}; }
    .content { padding:36px 40px; font-size:16px; line-height:1.6; color:${COLOR.texto}; }
    .content h2 { margin:0 0 14px; font-size:21px; font-weight:700; color:${COLOR.texto}; }
    .content p { margin:0 0 16px; }
    .content .muted { color:${COLOR.textoSuave}; font-size:14px; }
    .tabla-items { width:100%; margin:8px 0 4px; }
    .tabla-items th { padding:0 0 10px; border-bottom:1px solid ${COLOR.borde}; font-size:12px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${COLOR.textoTenue}; text-align:left; }
    .tabla-items td { padding:12px 0; border-bottom:1px solid ${COLOR.borde}; font-size:15px; vertical-align:top; }
    .tabla-items td.precio, .tabla-items th.precio { text-align:right; white-space:nowrap; }
    .tabla-items tr.total td { border-bottom:none; padding-top:16px; font-size:17px; font-weight:800; }
    .footer { max-width:600px; margin:0 auto; padding:24px 40px 8px; text-align:center; font-size:12px; line-height:1.6; color:${COLOR.textoTenue}; }
    .footer a { color:${COLOR.textoSuave}; text-decoration:underline; }
    @media (max-width:620px) {
      .content { padding:28px 24px; }
      .header { padding:24px 24px 20px; }
      .footer { padding:20px 24px 8px; }
    }
    @media (prefers-color-scheme: dark) {
      body, .wrapper { background-color:#14140f !important; }
      .main { background-color:#1e1d18 !important; border-color:#33322b !important; }
      .header { border-color:#33322b !important; }
      .brand, .content h2, .content { color:#f2efe9 !important; }
      .content .muted, .footer { color:#a7a49a !important; }
      .tabla-items td, .tabla-items th { border-color:#33322b !important; }
    }
  </style>
</head>
<body class="fuente">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <div style="display:none;max-height:0;overflow:hidden;">&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
  <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table class="main fuente" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td class="barra-acento">&nbsp;</td></tr>
          <tr>
            <td class="header">
              <div class="brand">Sumarket<span>Express</span></div>
              <div class="tagline">Tu mercado, a un clic</div>
            </td>
          </tr>
          <tr>
            <td class="content">
              ${contenido}
            </td>
          </tr>
        </table>
        <table class="footer fuente" width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="footer">
              <p style="margin:0 0 4px;">SumarketExpress · Santiago, Chile</p>
              <p style="margin:0;">© ${new Date().getFullYear()} SumarketExpress. Recibiste este correo porque tienes cuenta o interactuaste con nuestra tienda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
