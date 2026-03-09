import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Note: Local proxying is removed to enforce use of VITE_API_BASE_URL 
    // for both local and production consistency.
  }
})
