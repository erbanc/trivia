import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Polyfill for global (needed for stompjs/sockjs)
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
