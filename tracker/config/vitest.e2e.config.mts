// Browser-driven e2e tests (Puppeteer), run with `yarn test:e2e`.
//
// Kept separate from vitest.config.mts (used by `yarn test`) because these
// tests spin up a real webpack-dev-server and a headless Chromium instance,
// which is much slower and shouldn't run as part of the normal unit suite.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e/**/*.e2e.spec.ts'],
    testTimeout: 120000,
    hookTimeout: 130000,
    fileParallelism: false,
  },
});
