/* eslint-disable @typescript-eslint/naming-convention -- HTTP header names */
import { Page } from 'puppeteer';

const FAKE_ACCESS_TOKEN = 'e2e-fake-dropbox-token';

/**
 * Seeds localStorage with a fake Dropbox access token *before* any page
 * script runs, so the app skips the "Login with Dropbox" screen and goes
 * straight to `AuthStatus.CHECKING`.
 *
 * Must be called before `page.goto()`.
 */
export async function bypassDropboxLogin(page: Page): Promise<void> {
  await page.evaluateOnNewDocument(token => {
    window.localStorage.setItem('dropboxToken', token);
  }, FAKE_ACCESS_TOKEN);
}

/** One file the app downloads/uploads via the Dropbox SDK. */
export interface IMockDropboxFile {
  /** Dropbox path, e.g. '/spent tracker/transactions.json'. */
  path: string;
  /** File contents returned for a filesDownload of `path`. */
  contents: string;
}

/**
 * Intercepts the Dropbox SDK's network calls so the app never talks to the
 * real Dropbox API:
 *  - `filesDownload` for a mocked path resolves with `contents`.
 *  - `filesUpload` for a mocked path succeeds and records the uploaded body
 *    (fetchable via the returned `uploads` map) instead of persisting it.
 *
 * Must be called before `page.goto()`.
 */
export async function mockDropboxApi(
  page: Page,
  files: IMockDropboxFile[]
): Promise<{ uploads: Map<string, string> }> {
  const uploads = new Map<string, string>();
  const filesByPath = new Map(files.map(f => [f.path, f.contents]));

  // The real Dropbox API responds with CORS headers allowing
  // localhost/browser access; our mocked responses need to too, or the
  // browser rejects them (and the preflight OPTIONS request) before the
  // app's own code ever sees them.
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': '*',
    // Custom response headers (like dropbox-api-result) are otherwise
    // invisible to page JS on a cross-origin response.
    'access-control-expose-headers': '*',
  };

  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();

    if (!url.startsWith('https://content.dropboxapi.com/2/files/')) {
      request.continue();
      return;
    }

    if (request.method() === 'OPTIONS') {
      request.respond({ status: 200, headers: corsHeaders });
      return;
    }

    if (url.startsWith('https://content.dropboxapi.com/2/files/download')) {
      const apiArg = JSON.parse(request.headers()['dropbox-api-arg'] || '{}');
      const contents = filesByPath.get(apiArg.path);
      if (contents === undefined) {
        request.respond({
          status: 409,
          headers: corsHeaders,
          body: 'path/not_found/',
        });
        return;
      }
      request.respond({
        status: 200,
        contentType: 'application/octet-stream',
        headers: {
          ...corsHeaders,
          'dropbox-api-result': JSON.stringify({
            name: apiArg.path.split('/').pop(),
            path_lower: apiArg.path,
            id: 'id:e2e-mock',
            size: contents.length,
          }),
        },
        body: contents,
      });
      return;
    }

    if (url.startsWith('https://content.dropboxapi.com/2/files/upload')) {
      const apiArg = JSON.parse(request.headers()['dropbox-api-arg'] || '{}');
      uploads.set(apiArg.path, request.postData() || '');
      request.respond({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          name: apiArg.path.split('/').pop(),
          path_lower: apiArg.path,
          id: 'id:e2e-mock',
        }),
      });
      return;
    }

    request.continue();
  });

  return { uploads };
}
