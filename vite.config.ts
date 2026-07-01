import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/gana-api': {
        target: process.env.VITE_GANA_API_TARGET ?? 'http://127.0.0.1:4317',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gana-api/, '/api'),
      },
    },
  },
});
