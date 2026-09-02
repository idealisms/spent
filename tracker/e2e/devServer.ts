import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

export const E2E_PORT = 8080;
export const E2E_URL = `http://localhost:${E2E_PORT}/`;

const TRACKER_ROOT = path.join(__dirname, '..');
const CONFIG_TS_PATH = path.join(TRACKER_ROOT, 'app/config.ts');

/**
 * `app/config.ts` is gitignored (holds the real Dropbox app key) so it
 * won't exist on a fresh checkout/CI. The e2e app never actually talks to
 * Dropbox (all calls are mocked), so a placeholder value is enough to let
 * the build succeed. Leaves an existing file (e.g. a developer's real one)
 * untouched.
 */
function ensureConfigTsExists(): void {
  if (fs.existsSync(CONFIG_TS_PATH)) {
    return;
  }
  fs.writeFileSync(
    CONFIG_TS_PATH,
    "export const CLIENT_ID = 'e2e-placeholder-client-id';\n",
  );
}

function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http
        .get(url, res => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (Date.now() > deadline) {
            reject(new Error(`Timed out waiting for ${url}`));
            return;
          }
          setTimeout(tryOnce, 500);
        });
    };
    tryOnce();
  });
}

/**
 * Starts `webpack-dev-server` for the app and resolves once it is
 * responding to HTTP requests. Caller is responsible for calling
 * `stopDevServer` when done.
 */
export async function startDevServer(): Promise<ChildProcess> {
  ensureConfigTsExists();

  const child = spawn(
    'node',
    [
      require.resolve('webpack-dev-server/bin/webpack-dev-server.js'),
      '--mode=development',
      '--config',
      'config/webpack.dev.config.js',
      '--port',
      String(E2E_PORT),
    ],
    {
      cwd: TRACKER_ROOT,
      stdio: 'pipe',
    },
  );

  let stderr = '';
  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(E2E_URL, 120000);
  } catch (err) {
    child.kill();
    throw new Error(
      `${(err as Error).message}\nwebpack-dev-server stderr:\n${stderr}`,
    );
  }

  return child;
}

export function stopDevServer(child: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    child.once('exit', () => resolve());
    child.kill();
  });
}
