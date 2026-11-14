import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Layer 3 note: the browser never talks to Jira or Groq directly.
// Everything goes through the local proxy on :8787 so credentials stay server-side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
