import { servicioCorreo } from '../modules/correo/correo.service.js'

// Envío de prueba del servicio de correo. Confirma que el transporte real (Brevo,
// si BREVO_API_KEY está presente) acepta las credenciales y el remitente
// verificado, antes de construir flujos encima (recuperación de contraseña).
// Uso: npm run correo:test -- destino@correo.cl
async function probarCorreo() {
  const para = process.argv[2]
  if (!para) {
    console.error('Falta el destinatario. Uso: npm run correo:test -- tu@correo.cl')
    process.exitCode = 1
    return
  }

  const usaBrevo = Boolean(process.env.BREVO_API_KEY)
  console.log(
    usaBrevo
      ? '→ Enviando de verdad por Brevo…'
      : '→ Sin BREVO_API_KEY: el correo solo se registra en consola (no se envía de verdad).',
  )

  const resultado = await servicioCorreo.enviar({
    para,
    asunto: 'Prueba de correo · SumarketExpress',
    texto: 'Si lees esto, el envío de correos de SumarketExpress funciona. 🎉',
    html: '<p>Si lees esto, el envío de correos de <strong>SumarketExpress</strong> funciona. 🎉</p>',
  })

  console.log(`✓ Aceptado por el proveedor. id=${resultado.id ?? '(sin id)'} · para=${para}`)
  if (usaBrevo) {
    console.log('Revisa la bandeja de entrada (y spam) del destinatario.')
  }
}

probarCorreo().catch((error) => {
  console.error('✗ Falló el envío:', error.message)
  process.exitCode = 1
})
