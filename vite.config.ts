import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// BASE_PATH overrides the production base, e.g. '/Communities2/' for GitHub Pages.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.BASE_PATH ?? (mode === 'production' ? '/communities/' : '/'),
}))
