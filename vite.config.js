import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local/container testing without a real backend: `npm run dev:mock` sets
// VITE_MOCK=1, which aliases firebase/auth + firebase/firestore to in-memory
// shims (src/mocks/*). Production builds never set this flag, so the real
// Firebase SDK is always used in deployed bundles.
const useMock = process.env.VITE_MOCK === '1' || process.env.VITE_MOCK === 'true';

const mockAlias = useMock
  ? {
      'firebase/auth': fileURLToPath(new URL('./src/mocks/auth.js', import.meta.url)),
      'firebase/firestore': fileURLToPath(new URL('./src/mocks/firestore.js', import.meta.url)),
    }
  : {};

export default defineConfig({
  plugins: [react()],
  resolve: { alias: mockAlias },
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
