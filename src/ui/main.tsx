import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppRuntimeProvider } from './stores/useAppRuntimeStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRuntimeProvider>
      <App />
    </AppRuntimeProvider>
  </StrictMode>,
)
