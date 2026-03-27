import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 4545,
    host: 'localhost',
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4646'
    }
  },
  preview: {
    port: 4545,
    host: true,
    strictPort: true,
  },
});
