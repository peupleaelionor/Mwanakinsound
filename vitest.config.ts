import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Mêmes alias que tsconfig.json : les imports `@mabele/*` sont le contrat
      // stable, l'implémentation locale n'est qu'un repli (§5 du brief).
      '@mabele/core': fileURLToPath(
        new URL('./packages/mabele-core/src/index.ts', import.meta.url),
      ),
      '@mabele/i18n': fileURLToPath(
        new URL('./packages/mabele-i18n/src/index.ts', import.meta.url),
      ),
      '@mabele/credit': fileURLToPath(
        new URL('./packages/mabele-credit/src/index.ts', import.meta.url),
      ),
      '@mabele/agent': fileURLToPath(
        new URL('./packages/mabele-agent/src/index.ts', import.meta.url),
      ),
    },
  },
});
