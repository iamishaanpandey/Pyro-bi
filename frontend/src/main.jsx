import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// 1. Generate or retrieve Browser Fingerprint (UUID)
let userId = localStorage.getItem('pyro_user_id')
if (!userId) {
  userId = crypto.randomUUID()
  localStorage.setItem('pyro_user_id', userId)
}

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

// 2. Attach UUID to every backend request
axios.interceptors.request.use(config => {
  config.headers['X-User-ID'] = userId
  return config
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
