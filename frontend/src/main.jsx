// frontend/src/main.jsx - WITHOUT STRICT MODE
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

// NOTE: StrictMode is disabled to prevent double-mounting
// which causes multiple WebRTC connections
ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)