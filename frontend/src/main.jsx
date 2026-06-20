import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// Intercept all relative fetch calls starting with /api and route them to VITE_API_URL
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
  
  if (typeof url === 'string' && (url.startsWith('/api') || url.startsWith('api/'))) {
    const relativePart = url.startsWith('/') ? url : '/' + url;
    let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    // Auto-detect production environment: if running on a live site but baseUrl points to localhost,
    // automatically fall back to the production backend URL.
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        baseUrl = 'https://projectabc-backend.vercel.app/api';
      }
    }
    
    // Clean double slashes in paths like "backend.vercel.app//api" -> "backend.vercel.app/api"
    let cleanedBase = baseUrl.replace(/([^:]\/)\/+/g, "$1");
    // Ensure it doesn't end with a slash
    cleanedBase = cleanedBase.replace(/\/+$/, '');
    
    let targetUrl;
    if (cleanedBase.endsWith('/api')) {
      targetUrl = cleanedBase + relativePart.slice(4);
    } else {
      targetUrl = cleanedBase + relativePart;
    }
    
    if (typeof input === 'string') {
      input = targetUrl;
    } else if (input instanceof Request) {
      input = new Request(targetUrl, input);
    }
  }
  return originalFetch.call(this, input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: 'white',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
