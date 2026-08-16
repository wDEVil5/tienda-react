import app from './app.js'
import { iniciarBarridoExpiracion } from './modules/pedidos/pedidos.barrido.js'

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
  console.log(`API disponible en http://localhost:${port}`)
})

// Limpieza periódica de pedidos PENDIENTE abandonados (libera su stock reservado).
// Corre solo con el server real; los tests importan app.js y no lo disparan.
iniciarBarridoExpiracion()
