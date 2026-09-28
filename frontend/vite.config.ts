import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), 'BHUSHA_')
  const apiTarget = process.env.BHUSHA_API_TARGET ?? fileEnv.BHUSHA_API_TARGET ?? 'http://localhost:8001'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': apiTarget,
      },
    },
  }
})
