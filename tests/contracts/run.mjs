// Runs the contract tests on a throwaway ibc node: its own port and a
// temporary data directory, deleted afterwards, so no node's data is touched.
//
//   npm run test:contracts                         # starts ../ibc-go/ibc
//   IBC_BIN=/path/to/ibc npm run test:contracts    # another node binary
//   IBC_URL=http://localhost:2611 npm run test:contracts   # a running node instead (it keeps the test data)
//
// The node compiles with its pinned solc. A throwaway node copies it from
// IBC_SOLC_DIR (default ~/ibc-data/solc) if it is there; otherwise it
// downloads it, the first time.
import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const tests = ['community.test.mjs', 'contracts.test.mjs'].map((file) => join(here, file));

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function waitFor(url, node) {
  for (let i = 0; i < 100; i++) {
    if (node.exitCode !== null) throw new Error(`the node exited (${node.exitCode}): see its output above`);
    try {
      if ((await fetch(`${url}/ibc/app?action=node_info`)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`the node at ${url} did not start`);
}

function runTests(url) {
  return new Promise((resolve) => {
    const run = spawn(process.execPath, ['--test', '--test-concurrency=2', ...tests],
      { stdio: 'inherit', env: { ...process.env, IBC_URL: url } });
    run.on('exit', (code) => resolve(code ?? 1));
  });
}

let code;
if (process.env.IBC_URL) {
  code = await runTests(process.env.IBC_URL);
} else {
  const bin = process.env.IBC_BIN ?? join(here, '../../../ibc-go/ibc');
  if (!(await exists(bin))) {
    console.error(`No ibc node binary at ${bin}: build ibc-go (go build ./cmd/ibc), or set IBC_BIN or IBC_URL.`);
    process.exit(1);
  }
  const data = await mkdtemp(join(tmpdir(), 'communities-ibc-'));
  const solc = process.env.IBC_SOLC_DIR ?? join(homedir(), 'ibc-data/solc');
  if (await exists(solc)) await cp(solc, join(data, 'solc'), { recursive: true });
  const port = process.env.IBC_PORT ?? '2799';
  const url = `http://127.0.0.1:${port}`;
  const node = spawn(bin, ['-addr', `127.0.0.1:${port}`, '-data', data], { stdio: ['ignore', 'ignore', 'inherit'] });
  try {
    await waitFor(url, node);
    code = await runTests(url);
  } finally {
    node.kill();
    await new Promise((resolve) => (node.exitCode !== null ? resolve() : node.on('exit', resolve)));
    await rm(data, { recursive: true, force: true });
  }
}
process.exit(code);
