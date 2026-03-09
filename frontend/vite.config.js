import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Route ALL API calls to the FastAPI backend on port 8000
      '/query': 'http://localhost:8000',
      '/upload-csv': 'http://localhost:8000',
      '/schema': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/tables': 'http://localhost:8000',
      '/sessions': 'http://localhost:8000',
      '/clear-data': 'http://localhost:8000',
      '/detailed-analysis': 'http://localhost:8000',
      '/analysis-suggestions': 'http://localhost:8000',
      '/preview': 'http://localhost:8000',
      '/normalization-suggestions': 'http://localhost:8000',
      '/apply-normalization': 'http://localhost:8000',
      '/update-column': 'http://localhost:8000',
    }
  }
})
