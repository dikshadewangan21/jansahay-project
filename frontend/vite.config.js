import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor splitting — keeps main bundle lean
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor':  ['recharts'],
          'map-vendor':     ['leaflet'],
          'icons-vendor':   ['lucide-react'],
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy uploaded images from backend static server
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
