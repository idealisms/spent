# E2E tests

Browser-driven tests using [Puppeteer](https://pptr.dev/) against a real
`webpack-dev-server` instance. They never talk to Dropbox: the login is
bypassed and all Dropbox API calls are intercepted and answered with mock
data, so these run offline and don't need any real credentials.

## Running

```bash
yarn test:e2e
```

This is a separate Jest config (`config/jest.e2e.config.js`) from the main
`yarn test` — it's slower (spins up a dev server + headless Chromium) so it
doesn't run as part of the normal unit test suite. It has its own CI job
(`test-tracker-e2e`).

`puppeteer` is pinned to `21.11.0` (last version with a CommonJS build) —
`^22` and later ship ESM-only, which `ts-jest`'s CommonJS output can't
`require()`. Bump only alongside a wider ESM migration of the test setup.

## How the mocking works

- `bypassDropboxLogin(page)` seeds `localStorage.dropboxToken` before any
  app code runs, so `AuthRoute` skips straight past the "Login with
  Dropbox" screen.
- `mockDropboxApi(page, files)` turns on request interception and answers
  the Dropbox SDK's `filesDownload`/`filesUpload` calls (including the CORS
  preflight) with your mock file contents instead of hitting
  `content.dropboxapi.com`.
- `fixtures.ts` has ready-made mock `transactions.json`/`settings.json`
  content. The mock transactions are dated a month apart so they show up on
  the Editor page regardless of what day the test runs (the Editor's
  default date range spans the transaction list's own oldest → newest
  dates).

Both helpers must be called before `page.goto()`.

## Writing a new test

```ts
const page = await browser.newPage();
await bypassDropboxLogin(page);
await mockDropboxApi(page, MOCK_DROPBOX_FILES);
await page.goto(`${E2E_URL}editor`, { waitUntil: 'networkidle0' });
```

See `app.e2e.spec.ts` for a full example, including `beforeAll`/`afterAll`
setup of the dev server and browser.
