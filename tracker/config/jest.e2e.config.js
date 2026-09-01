// Separate Jest config for browser-driven e2e tests (Puppeteer).
//
// Kept out of package.json's "jest" block (used by `yarn test`) because
// these tests spin up a real webpack-dev-server and a headless Chromium
// instance, which is much slower and shouldn't run as part of the normal
// unit test suite. Run with `yarn test:e2e`.
module.exports = {
  rootDir: '..',
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  testRegex: '/e2e/.*\\.e2e\\.spec\\.ts$',
  testEnvironment: 'node',
  testTimeout: 120000,
};
