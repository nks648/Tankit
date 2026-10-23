import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Relative asset paths so the build works from any folder,
  // e.g. GitHub Pages at https://<user>.github.io/Tankit/
  base: './',

  // No dev proxies: Nominatim, Overpass and Supabase are all called directly
  // from the browser (they allow CORS), so dev and production behave the same.

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    exclude: ['node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
})
