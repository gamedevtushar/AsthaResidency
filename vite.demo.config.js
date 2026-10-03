import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// `npm run demo`: runs the app with in-memory sample data instead of Firebase (see /demo).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'import.meta.env.VITE_DEMO': JSON.stringify('1') },
  resolve: {
    alias: {
      'firebase/app': path.resolve('demo/app.js'),
      'firebase/auth': path.resolve('demo/auth.js'),
      'firebase/firestore': path.resolve('demo/firestore.js'),
    },
  },
  server: { port: 5180, open: true },
})
