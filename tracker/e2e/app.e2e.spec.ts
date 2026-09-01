import { ChildProcess } from 'child_process';
import puppeteer, { Browser, Page } from 'puppeteer';
import { bypassDropboxLogin, mockDropboxApi } from './dropboxMocks';
import { E2E_URL, startDevServer, stopDevServer } from './devServer';
import { MOCK_DROPBOX_FILES, MOCK_TRANSACTIONS } from './fixtures';

let devServer: ChildProcess;
let browser: Browser;

beforeAll(async () => {
  devServer = await startDevServer();
  browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ['--no-sandbox'] : [],
  });
}, 130000);

afterAll(async () => {
  await browser?.close();
  if (devServer) {
    await stopDevServer(devServer);
  }
});

async function newPageBypassingLogin(): Promise<Page> {
  const page = await browser.newPage();
  await bypassDropboxLogin(page);
  await mockDropboxApi(page, MOCK_DROPBOX_FILES);
  return page;
}

describe('Editor page', () => {
  it('renders mocked transactions without hitting the real Dropbox login', async () => {
    const page = await newPageBypassingLogin();

    await page.goto(`${E2E_URL}editor`, { waitUntil: 'networkidle0' });

    // Should never fall through to the "Login with Dropbox" screen.
    await expect(
      page.$('a[href*="dropbox.com/oauth2/authorize"]')
    ).resolves.toBeNull();

    for (const transaction of MOCK_TRANSACTIONS) {
      await page.waitForFunction(
        description => document.body.innerText.includes(description),
        {},
        transaction.description
      );
    }

    await page.close();
  });
});
