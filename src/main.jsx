import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CarritoProvider } from './context/CarritoContext.jsx'
import { CuentaProvider } from './context/CuentaContext.jsx'
import { ReglasProvider } from './context/ReglasContext.jsx'
import { IdentidadProvider } from './context/IdentidadContext.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'
import { aplicarRetornoPago } from './lib/retornoPago.js'

// Debe ocurrir antes de montar BrowserRouter: Pages entrega la raíz estática y
// este reemplazo deja que React vea directamente `/pago/exito|error|pendiente`.
aplicarRetornoPago()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ReglasProvider>
        <IdentidadProvider>
          <CuentaProvider>
            <CarritoProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </CarritoProvider>
          </CuentaProvider>
        </IdentidadProvider>
      </ReglasProvider>
    </BrowserRouter>
  </StrictMode>,
)
