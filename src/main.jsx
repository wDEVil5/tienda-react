import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CarritoProvider } from './context/CarritoContext.jsx'
import { CuentaProvider } from './context/CuentaContext.jsx'
import { ReglasProvider } from './context/ReglasContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ReglasProvider>
        <CuentaProvider>
          <CarritoProvider>
            <App />
          </CarritoProvider>
        </CuentaProvider>
      </ReglasProvider>
    </BrowserRouter>
  </StrictMode>,
)
