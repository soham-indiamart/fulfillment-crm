import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // In development and preview, the dashboard and the API share one origin through this proxy,
  // the same way the nginx image (or a CDN) routes them in production.
  const backend = loadEnv(mode, process.cwd(), '').BACKEND_URL || 'http://localhost:8080';
  const proxy = { '/api': backend, '/uploads': backend };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: {
      outDir: 'dist',
      // Source maps for error tracking, without exposing them to browsers.
      sourcemap: 'hidden',
    },
  };
});
