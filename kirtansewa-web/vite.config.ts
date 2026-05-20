import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok-free.app:5173',
      '.ngrok-free.app:4173',
    ],
  },
})
