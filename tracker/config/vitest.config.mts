// Unit tests (`yarn test`). Browser-driven e2e tests have their own config
// (vitest.e2e.config.mts) since they're much slower and need a real
// webpack-dev-server + Chromium.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://www.example.com/' },
    },
    include: ['app/**/*.spec.{ts,tsx,js}'],
    setupFiles: ['./config/test.setup.ts'],
  },
});
