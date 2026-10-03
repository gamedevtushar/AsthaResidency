import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'

/** Emits sw.js (from src/sw.js) with a unique build id, so every deploy refreshes the app on phones. */
function serviceWorker() {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle() {
      const source = fs.readFileSync('src/sw.js', 'utf8').replace("'__BUILD_ID__'", `'${Date.now().toString(36)}'`)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  // GitHub Pages serves the site from /<repo-name>/ (set by the deploy workflow)
  base: process.env.BASE_PATH || '/',
  build: { chunkSizeWarningLimit: 1200 },
  server: { open: true },
})
