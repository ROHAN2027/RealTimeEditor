import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './App.css'
import { ThemeProvider } from './context/ThemeContext'; // 🌟 Import the ThemeProvider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider> {/* 🌟 Wrap the app */}
            <App />
        </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
