import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/slots': { target: 'http://localhost:5002', changeOrigin: true },
      '/api/admin': { target: 'http://localhost:5002', changeOrigin: true },
      '/uploads':   { target: 'http://localhost:5001', changeOrigin: true }
    }
  }
})
