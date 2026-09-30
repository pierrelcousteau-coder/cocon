import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH = "/<nom-du-repo>/" pour GitHub Pages (défini dans le workflow)
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
