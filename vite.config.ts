import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sheetsMiddleware } from './server/sheetsMiddleware';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [tailwindcss(), react(), sheetsMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('/data/realMenuDB')) {
            return 'menu-data';
          }
          if (id.includes('/data/historicalMealPlans')) {
            return 'history-data';
          }
          if (
            id.includes('node_modules/html2pdf') ||
            id.includes('node_modules/html2canvas') ||
            id.includes('node_modules/jspdf')
          ) {
            return 'vendor-pdf';
          }
        },
      },
    },
  },
});
