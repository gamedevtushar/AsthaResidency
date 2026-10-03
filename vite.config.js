import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves the site from /<repo-name>/ (set by the deploy workflow)
  base: process.env.BASE_PATH || '/',
  build: { chunkSizeWarningLimit: 1200 },
  server: { open: true },
})
