import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The reference project lives next to the app; keep Vite's scanner and watcher out of it.
const IGNORED = ['**/The-Pelican-Test-reference-project/**', '**/.idea/**', '**/font/**'];

export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: { entries: ['index.html'] },
  server: { port: 5190, watch: { ignored: IGNORED } },
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
});
