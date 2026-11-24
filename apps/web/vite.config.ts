import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { coopCoepHeaders } from './src/headers.js';

export { coopCoepHeaders };

/**
 * Vite Configuration for Tensorcade Web Application.
 * Configured with strict COOP/COEP headers on both dev and preview servers.
 */
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: coopCoepHeaders,
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: coopCoepHeaders,
  },
});
