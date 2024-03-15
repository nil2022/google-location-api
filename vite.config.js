import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, '', '')
  
  return {
    server: {
      port: 3001,
      cors: {
        origin: env.VITE_CLIENT_ORIGIN,
        credentials: true,
        allowedHeaders: env.VITE_CLIENT_ALLOWED_HEADERS
      },
    },
    build: {
      outDir: 'public',
      emptyOutDir: true
    },
    preview: {
      port: 3001
    },
    plugins: [react()],
  }
})
