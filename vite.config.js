import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'TankIT-FuelFinder/1.0 (https://github.com/tankit)')
          })
        },
      },
      '/api/tankerkoenig': {
        target: 'https://creativecommons.tankerkoenig.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tankerkoenig/, '/json'),
      },
    },
  },
})
