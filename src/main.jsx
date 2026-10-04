import { registerServiceWorker } from './pwa' // first: catches the browser's install event early
import { applyTheme } from './theme'
import { installTapFeedback } from './lib/feedback'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './i18n'
import App from './App'
import './index.css'

registerServiceWorker()
applyTheme()
installTapFeedback()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <LangProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
)
