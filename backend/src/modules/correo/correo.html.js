export function plantillaBaseHTML({ titulo, preheader = '', contenido }) {
  const COLOR_ACENTO = '#2f6b4a';
  const COLOR_FONDO = '#fbfaf7';
  const COLOR_SUPERFICIE = '#ffffff';
  const COLOR_TEXTO = '#1c1b18';
  const COLOR_TEXTO_SUAVE = '#6f6d64';
  const COLOR_BORDE = '#e3e0d7';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${COLOR_FONDO};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: ${COLOR_TEXTO};
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: ${COLOR_FONDO};
      padding: 40px 0;
    }
    .main {
      background-color: ${COLOR_SUPERFICIE};
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-radius: 12px;
      border: 1px solid ${COLOR_BORDE};
      overflow: hidden;
    }
    .header {
      padding: 30px 40px;
      text-align: center;
      border-bottom: 1px solid ${COLOR_BORDE};
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: ${COLOR_ACENTO};
      font-weight: 700;
    }
    .content {
      padding: 40px;
      font-size: 16px;
      line-height: 1.6;
      color: ${COLOR_TEXTO};
    }
    .content h2 {
      margin-top: 0;
      font-size: 20px;
      color: ${COLOR_TEXTO};
    }
    .content p {
      margin-top: 0;
      margin-bottom: 20px;
    }
    .footer {
      padding: 30px 40px;
      text-align: center;
      font-size: 13px;
      color: ${COLOR_TEXTO_SUAVE};
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${COLOR_ACENTO};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 10px 0;
      text-align: center;
    }
    .tabla-items {
      width: 100%;
      margin-bottom: 20px;
      border-top: 1px solid ${COLOR_BORDE};
    }
    .tabla-items th, .tabla-items td {
      padding: 12px 0;
      border-bottom: 1px solid ${COLOR_BORDE};
      text-align: left;
    }
    .tabla-items th {
      font-size: 14px;
      color: ${COLOR_TEXTO_SUAVE};
      font-weight: 500;
    }
    .tabla-items td.precio {
      text-align: right;
      font-weight: 600;
    }
    .total-row td {
      font-size: 18px;
      font-weight: 700;
      border-bottom: none;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader}
  </div>
  <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table class="main" cellpadding="0" cellspacing="0" role="presentation">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1>SumarketExpress</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="content">
              ${contenido}
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td class="footer">
              <p style="margin: 0;">© ${new Date().getFullYear()} SumarketExpress. Todos los derechos reservados.</p>
              <p style="margin: 5px 0 0 0;">Has recibido este correo porque estás registrado o interactuaste con nuestra tienda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
