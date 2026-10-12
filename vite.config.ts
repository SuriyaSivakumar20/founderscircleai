import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [tailwindcss(), react()],
  // SECURITY: the Gemini API key is intentionally NOT injected here.
  // It used to be baked into the client bundle via `define` — every visitor
  // could extract it from the JS. All Gemini calls are proxied server-side
  // (see server.ts / api/index.ts) where the key stays in env vars.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
