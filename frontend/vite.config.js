import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const backendProxy = { target: 'http://localhost:3002', changeOrigin: true };

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5174,
    proxy: {
      '/api': backendProxy,
      '/uploads': backendProxy,
      '/socket.io': { ...backendProxy, ws: true },
    },
  },
  preview: { port: 4174 },
});
