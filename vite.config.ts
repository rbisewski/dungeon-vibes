import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // three.js alone is ~500 kB minified; one chunk is fine for a game that needs all of it up front.
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'] },
});
