import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Route ALL API calls to the FastAPI backend on port 8001
      '/query': 'http://localhost:8001',
      '/upload-csv': 'http://localhost:8001',
      '/schema': 'http://localhost:8001',
      '/health': 'http://localhost:8001',
      '/tables': 'http://localhost:8001',
      '/sessions': 'http://localhost:8001',
      '/clear-data': 'http://localhost:8001',
      '/detailed-analysis': 'http://localhost:8001',
      '/analysis-suggestions': 'http://localhost:8001',
      '/preview': 'http://localhost:8001',
      '/normalization-suggestions': 'http://localhost:8001',
      '/apply-normalization': 'http://localhost:8001',
    }
  }
})
