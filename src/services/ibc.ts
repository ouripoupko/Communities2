// The connection to the user's ibc node. The app never holds the user's
// keys: IbcApp gives it a browser key of its own, and the node's approval
// page asks the user (with their passkey) for everything the app may not do
// silently.
import { IbcApp, IbcError, needsApproval } from '@ouripoupko/ibc';

export type { IbcApp, IbcEvent, ContractSummary } from '@ouripoupko/ibc';

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
 * Reads without ever asking: a read the user has not let the app make fails
 * with an error for which needsAccess() is true. The app then offers the
 * user to allow access (permit), from a click, rather than asking for each
 * read (IbcApp.read would open the approval page every time).
 */
export async function readSilently(contract: string, method: string, values: Record<string, unknown> = {}): Promise<unknown> {
  const ibc = getApp().ibc;
  if (!ibc) throw new IbcError('reading this contract needs your approval on your node\'s page');
  return await ibc.read(contract, method, values);
}

/**
 * Writes without ever asking: a call the user has not let the app make
 * silently fails with an error for which needsAccess() is true. For calls
 * not started by a click, where the approval page could not open.
 */
export async function writeSilently(contract: string, method: string, values: Record<string, unknown> = {}): Promise<unknown> {
  const ibc = getApp().ibc;
  if (!ibc) throw new IbcError(`calling ${method} needs your approval on your node's page`);
  return await ibc.writeSilently(contract, method, values);
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
