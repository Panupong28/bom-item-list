import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds a single self-contained HTML file of the app in MOCK mode (in-memory
// auth + Firestore), for publishing as a shareable, fully interactive demo.
// Everything is inlined; the app makes no network requests.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      'firebase/auth': fileURLToPath(new URL('./src/mocks/auth.js', import.meta.url)),
      'firebase/firestore': fileURLToPath(new URL('./src/mocks/firestore.js', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000,
    cssCodeSplit: false,
    // Disable minification so the inlined JS uses literal UTF-8 rather than
    // \uXXXX escape sequences (the Artifact publish pipeline rejects those).
    minify: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
