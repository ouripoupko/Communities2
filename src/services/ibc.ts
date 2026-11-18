// The connection to the user's ibc node. The app never holds the user's
// keys: IbcApp gives it a browser key of its own, and the node's approval
// page asks the user (with their passkey) for everything the app may not do
// silently.
import { IbcApp, IbcError, needsApproval } from '@ouripoupko/ibc';
import { eventStreamService } from './eventStream';
import type { BlockchainEvent } from './eventStream';
import { trace } from './trace';

export type { IbcApp, IbcEvent, ContractSummary, Sources } from '@ouripoupko/ibc';
import type { Sources } from '@ouripoupko/ibc';

let current: IbcApp | null = null;

/** Opens the app's connection to the node at nodeUrl. */
export async function openApp(nodeUrl: string): Promise<IbcApp> {
  const node = new URL(nodeUrl).origin;
  if (current?.node === node) return current;
  current = await IbcApp.open(node);
  return current;
}

/** The open app; throws if there is none (no one is logged in). */
export function getApp(): IbcApp {
  if (!current) throw new Error('Not connected to an ibc node');
  return current;
}

/**
 * Where a call goes in a contract (an ibc agreement): the root contract
 * deployed, or, with at, another contract of it, by its address.
 */
export interface CallOptions {
  at?: string;
}

/**
 * Reads without ever asking: a read the user has not let the app make fails
 * with an error for which needsAccess() is true. The app then offers the
 * user to allow access (permit), from a click, rather than asking for each
 * read (IbcApp.read would open the approval page every time).
 */
export async function readSilently(
  contract: string, method: string, values: Record<string, unknown> = {}, { at }: CallOptions = {},
): Promise<unknown> {
  const ibc = getApp().ibc;
  if (!ibc) throw new IbcError('reading this contract needs your approval on your node\'s page');
  const result = await ibc.read(contract, method, values, { at });
  trace('read', contract, at ?? '', method, values, '→', result);
  return result;
}

/**
 * Writes without ever asking: a call the user has not let the app make
 * silently fails with an error for which needsAccess() is true. For calls
 * not started by a click, where the approval page could not open.
 */
export async function writeSilently(
  contract: string, method: string, values: Record<string, unknown> = {}, { at }: CallOptions = {},
): Promise<unknown> {
  const ibc = getApp().ibc;
  if (!ibc) throw new IbcError(`calling ${method} needs your approval on your node's page`);
  trace('write', contract, at ?? '', method, values, '(silently)');
  return await ibc.writeSilently(contract, method, values, { at });
}

/**
 * Writes, asking the user on the node's approval page if the app may not
 * make this call silently. Call it from a click, so the page can open.
 */
export async function write(
  contract: string, method: string, values: Record<string, unknown> = {}, { at }: CallOptions = {},
): Promise<unknown> {
  trace('write', contract, at ?? '', method, values);
  return await getApp().write(contract, method, values, { at });
}

/** Deploys a contract on the user's node; the node's approval page asks first. Call it from a click. */
export async function deploy(input: Parameters<IbcApp['deploy']>[0]): Promise<string> {
  trace('deploy', input.name, input.constructor);
  return await getApp().deploy(input);
}

/** Does an error mean the user must let the app access the contract? */
export const needsAccess = (error: unknown): boolean =>
  needsApproval(error) || /needs your approval|window was blocked/.test(error instanceof Error ? error.message : String(error));

/**
 * Does an error mean the node no longer knows this browser's app (or the
 * agent itself), so the stored session is gone: the user disconnected the
 * app, or the node lost its data?
 */
export const isSessionGone = (error: unknown): boolean =>
  /nor an app it connected|is not registered|no such agent/.test(error instanceof Error ? error.message : String(error));

/** Asks the user to let the app access a contract they have. Call it from a click. */
export async function allowAccess(contract: string): Promise<void> {
  await getApp().permit(contract);
}

/**
 * What the user has of a contract: 'none' (they did not join it), 'joined'
 * (the app may not read it yet: allowAccess), or 'readable'.
 */
export async function contractAccess(contract: string): Promise<'none' | 'joined' | 'readable'> {
  const ibc = getApp().ibc;
  if (!ibc) return 'none';
  try {
    return (await ibc.contract(contract))?.id ? 'readable' : 'none';
  } catch (error) {
    if (needsApproval(error)) return 'joined';
    throw error;
  }
}

/** Whether the user has a contract on their node, even one the app may not read yet. */
export async function hasContract(contract: string): Promise<boolean> {
  return (await contractAccess(contract)) !== 'none';
}

/** How a join ended: whether the user's node now holds the contract, and its check of the source. */
export interface JoinOutcome {
  joined: boolean;
  sourceCheck?: string; // 'verified', 'unchecked' or 'mismatch'
  reason?: string;
}

// Joining checks the history, and compiles the source (perhaps downloading
// the compiler first): give it time.
const JOIN_TIMEOUT_MS = 5 * 60 * 1000;

/** What to join: the contract's source, and how. */
export interface JoinOptions {
  /** The contract's source, its files, byte for byte as deployed: the members check it. */
  source: Sources;
  /** Join as a guest (use the member's copy), rather than as a partner. */
  guest: boolean;
  /** The contract in the source ('Name'), when the source has several. */
  contractName?: string;
}

/**
 * Joins a contract through a member's node, as a partner (the user's node
 * keeps a copy and takes part in consensus) or as a guest (it uses the
 * member's copy). The user approves on their node, in one approval, the join
 * (of the source, which the members check) and this app's permissions for
 * that source; so call it from a click. Resolves with the outcome, which the
 * node reports as a join_contract event.
 */
export async function joinAndWait(
  contract: string,
  memberNode: string,
  memberAgent: string,
  { source, guest, contractName }: JoinOptions,
): Promise<JoinOutcome> {
  // The outcome can arrive before the join's id does: keep the events seen meanwhile.
  const seen: BlockchainEvent[] = [];
  let id: string | null = null;
  let onOutcome: ((event: BlockchainEvent) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listener = (event: BlockchainEvent) => {
    if (id !== null && event.request === id) onOutcome?.(event);
    else seen.push(event);
  };
  eventStreamService.addEventListener('join_contract', listener);
  try {
    id = await getApp().join(contract, memberNode, memberAgent, { source, guest, contractName });
    const event = seen.find((e) => e.request === id) ?? await new Promise<BlockchainEvent>((resolve, reject) => {
      onOutcome = resolve;
      timer = setTimeout(() => reject(new Error(
        'Your node has not finished joining yet. Check the contract on your node\'s page, and come back later.',
      )), JOIN_TIMEOUT_MS);
    });
    const joined = event.reply === true;
    if (joined) await untilHeld(contract);
    return { joined, sourceCheck: event.source_check, reason: event.reason };
  } finally {
    clearTimeout(timer);
    eventStreamService.removeEventListener('join_contract', listener);
  }
}

// How long to wait for the user's node to hold a contract it reported joining.
const HELD_TIMEOUT_MS = 30 * 1000;

/**
 * Waits until the user's node holds a contract it joined: it may report the
 * join a moment before it answers for the contract, and the app's next step
 * (asking to become a member, for a community) reads or writes it at once.
 */
async function untilHeld(contract: string): Promise<void> {
  const until = Date.now() + HELD_TIMEOUT_MS;
  while (Date.now() < until) {
    try {
      if ((await contractAccess(contract)) !== 'none') return;
    } catch {
      // not yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** The message for a join that did not go through. */
export const joinFailure = (outcome: JoinOutcome): string =>
  outcome.reason ? `The join did not go through: ${outcome.reason}.` : 'The contract did not accept you.';

/**
 * Forgets the app's key and agent in this browser, so the next login asks
 * the user again. IbcApp keeps them in its own IndexedDB database.
 */
export function forgetApp(): Promise<void> {
  current = null;
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('ibc-app');
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
