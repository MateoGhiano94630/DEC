import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo la API corre en scripts/dev-api.ts; en Vercel, /api son funciones serverless.
    proxy: { '/api': `http://localhost:${process.env.API_PORT ?? 3001}` },
  },
});
