// What the contract tests share: the node, agents, and the contracts' sources
// as the app sends them (src/services/contracts/sources.ts).
import { readFile, readdir } from 'node:fs/promises';
import { Ibc, addressOf, newP256Key, p256Signer } from '@ouripoupko/ibc';

const contracts = new URL('../../src/assets/contracts/', import.meta.url);

/** The node the tests run on: run.mjs starts one and sets IBC_URL. */
export const url = process.env.IBC_URL ?? 'http://localhost:2611';

/** A new agent, registered on the node; its root key signs everything. */
export async function newAgent() {
  const key = await newP256Key();
  const ibc = await Ibc.connect(url, { agent: addressOf(key.publicKey), root: p256Signer(key) });
  await ibc.register();
  return ibc;
}

/** A one-file contract's source. */
export async function sourceOf(file) {
  return { [file]: await readFile(new URL(file, contracts), 'utf8') };
}

/** The community's source: the files of contracts/community/. */
export async function communitySource() {
  const dir = new URL('community/', contracts);
  const source = {};
  for (const file of await readdir(dir)) if (file.endsWith('.sol')) source[file] = await readFile(new URL(file, dir), 'utf8');
  return source;
}

/** Compiles and deploys a source, as its agent; resolves with the contract's id. */
export async function deploy(agent, source, { contract, name = 'test', constructor = {} } = {}) {
  const compiled = await agent.compile(source, contract);
  return await agent.deploy({ name, ...compiled, constructor, source });
}

/** Waits until a join has completed: the agent can read the contract. */
export async function joined(agent, contract, method, { at } = {}) {
  for (let i = 0; i < 60; i++) {
    try {
      await agent.read(contract, method, {}, { at });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

export const lower = (address) => address.toLowerCase();
