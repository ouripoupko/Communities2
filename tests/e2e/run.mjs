// Runs the browser test of the app: a throwaway ibc node and the app's dev
// server, both on localhost (passkeys need a host name), and headless Chrome
// with a virtual passkey authenticator per user. Nothing outside a temporary
// directory is touched.
//
//   npm run test:e2e                     # the test
//   SHOTS=1 npm run test:e2e             # also saves the docs' screenshots in docs/screenshots/
//   CHROME=/path/to/chrome npm run test:e2e
//
// Like the contract tests, it uses ../ibc-go/ibc (or IBC_BIN), and copies the
// compiler from ~/ibc-data/solc (or IBC_SOLC_DIR) if it is there.
import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '../..');
const NODE_PORT = process.env.IBC_PORT ?? '2798';
const APP_PORT = process.env.APP_PORT ?? '5198';

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function waitFor(url, child, what) {
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw new Error(`${what} exited (${child.exitCode})`);
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${what} did not start at ${url}`);
}

const children = [];
const stop = async () => {
  for (const child of children) if (child.exitCode === null) child.kill();
  await Promise.all(children.map((child) => (child.exitCode !== null ? null : new Promise((r) => child.on('exit', r)))));
};

const bin = process.env.IBC_BIN ?? join(root, '../ibc-go/ibc');
if (!(await exists(bin))) {
  console.error(`No ibc node binary at ${bin}: build ibc-go (go build ./cmd/ibc), or set IBC_BIN.`);
  process.exit(1);
}
const data = await mkdtemp(join(tmpdir(), 'communities-e2e-'));
let code = 1;
try {
  const solc = process.env.IBC_SOLC_DIR ?? join(homedir(), 'ibc-data/solc');
  if (await exists(solc)) await cp(solc, join(data, 'solc'), { recursive: true });
  const nodeUrl = `http://localhost:${NODE_PORT}`;
  const appUrl = `http://localhost:${APP_PORT}`;
  const node = spawn(bin, ['-addr', `localhost:${NODE_PORT}`, '-data', data], { stdio: ['ignore', 'ignore', 'inherit'] });
  children.push(node);
  const vite = spawn(join(root, 'node_modules/.bin/vite'), ['--port', APP_PORT, '--strictPort', '--host', 'localhost'],
    { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
  children.push(vite);
  await waitFor(`${nodeUrl}/ibc/app?action=node_info`, node, 'the ibc node');
  await waitFor(appUrl, vite, 'the app\'s dev server');
  const test = spawn(process.execPath, [join(here, 'app.e2e.mjs')],
    { stdio: 'inherit', env: { ...process.env, NODE_URL: nodeUrl, APP_URL: appUrl } });
  code = await new Promise((resolve) => test.on('exit', (c) => resolve(c ?? 1)));
} finally {
  await stop();
  await rm(data, { recursive: true, force: true });
}
process.exit(code);
