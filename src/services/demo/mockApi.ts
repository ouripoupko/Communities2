// Mock implementations of the api.ts functions for demo contracts.
// All return the same shape as the real backend.
import type { IMethod, IContract } from '../interfaces';
import {
  isDemoContract,
  registerDemoContract,
  getDemoContract,
  listDemoContractsByType,
  newDemoId,
} from './demoRegistry';
import { routeRead, routeWrite } from './demoRouter';
import { initCommunity } from './demoContracts/community';

function detectDemoDeployName(name: string): boolean {
  return /^demo(\b|[\s-_])/i.test(name.trim()) || name.trim().toLowerCase().startsWith('demo');
}

// Called by the real api.ts wrapper for contractRead on a demo contract.
export async function mockContractRead({
  contractId,
  publicKey,
  method,
}: {
  serverUrl: string;
  publicKey: string;
  contractId: string;
  method: IMethod;
}): Promise<unknown> {
  return routeRead(contractId, method, publicKey);
}

export async function mockContractWrite({
  contractId,
  publicKey,
  method,
}: {
  serverUrl: string;
  publicKey: string;
  contractId: string;
  method: IMethod;
}): Promise<unknown> {
  return routeWrite(contractId, method, publicKey);
}

// Deploy — decision point: do we handle this as demo?
export async function tryMockDeployContract({
  serverUrl,
  publicKey,
  name,
  contract,
  code,
}: {
  serverUrl: string;
  publicKey: string;
  name: string;
  contract: string;
  code: string;
  profile?: string;
}): Promise<{ handled: boolean; result?: { id: string } }> {
  void serverUrl;
  void code;

  // Case 1: community with "demo" in the name → new demo community
  if (contract === 'community_contract.py' && detectDemoDeployName(name)) {
    const id = newDemoId('comm');
    registerDemoContract({ id, name, contract, createdAt: Date.now() });
    initCommunity(id, publicKey, { name, description: '' });
    console.log(`[DemoMock] Deployed demo community ${id} (${name})`);
    return { handled: true, result: { id } };
  }

  // Case 2: deploy targets an existing demo parent — handled by callers that
  // pre-check via `isDemoDeployContext()` and route directly. A generic deploy
  // whose parent isn't known here stays as a real deploy.
  return { handled: false };
}

// Direct deploy helper used by the seeder (bypasses network entirely).
export function mockDeployDirect({
  name,
  contract,
  parentId,
  kind = 'stage',
  publicKey,
  properties,
}: {
  name: string;
  contract: string;
  parentId?: string;
  kind?: 'comm' | 'init' | 'stage' | 'mod';
  publicKey?: string;
  properties?: Record<string, unknown>;
}): { id: string } {
  const id = newDemoId(kind);
  registerDemoContract({ id, name, contract, parentId, createdAt: Date.now() });
  if (contract === 'community_contract.py' && publicKey) {
    initCommunity(id, publicKey, properties ?? { name, description: '' });
  }
  return { id };
}

// joinContract on a demo contract is a no-op that returns success.
export async function mockJoinContract(): Promise<unknown> {
  return { ok: true };
}

// Expose the public-facing predicates.
export { isDemoContract, getDemoContract };

// Merge demo communities into the real contracts list.
export function mergeDemoContracts(realContracts: IContract[]): IContract[] {
  const demoCommunities = listDemoContractsByType('community_contract.py');
  const existingIds = new Set(realContracts.map((c) => c.id));
  const synthetic: IContract[] = demoCommunities
    .filter((m) => !existingIds.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.name,
      contract: m.contract,
      code: '',
      protocol: 'BFT',
      default_app: '',
      pid: '',
      address: '',
      group: [],
      threshold: 0,
      profile: null,
      constructor: {},
    }));
  return [...realContracts, ...synthetic];
}
