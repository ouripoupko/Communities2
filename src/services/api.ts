// Real API utility for contract and server calls
// Demo mode: calls targeting demo-prefixed contract IDs are intercepted
// locally (no network) by the mock layer in ./demo. Everything else hits the
// real backend.

import type { IMethod, IContract } from "./interfaces";
import {
  isDemoContract,
  mockContractRead,
  mockContractWrite,
  mockJoinContract,
  tryMockDeployContract,
  mergeDemoContracts,
} from "./demo/mockApi";

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const text = await response.text();
      let message = `HTTP ${response.status} ${response.statusText}`;
      try {
        const json = JSON.parse(text) as { message?: string; error?: string };
        if (json.message || json.error) message = json.message ?? json.error ?? message;
      } catch {
        if (text.trim() && !text.trim().startsWith('<')) message = text.trim();
      }
      throw new Error(message);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// IS_EXIST_AGENT
export async function isExistAgent({
  serverUrl,
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}) {
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=is_exist_agent`,
    { method: 'GET' }
  );
}

// REGISTER_AGENT
export async function registerAgent({
  serverUrl,
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}) {
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=register_agent`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: serverUrl }),
    }
  );
}

// GET_CONTRACTS — merges demo contracts into the real list so demo
// communities appear alongside real ones.
export async function getContracts({
  serverUrl,
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}): Promise<IContract[]> {
  let real: IContract[] = [];
  try {
    const result = await fetchWithTimeout(
      `${serverUrl}/ibc/app/${publicKey}?action=get_contracts`,
      { method: 'GET' }
    );
    real = Array.isArray(result) ? (result as IContract[]) : [];
  } catch (err) {
    // If the real backend is unreachable, we still surface demo contracts so
    // the user can explore demo communities offline.
    console.warn('[api] getContracts real fetch failed, returning demo-only list:', err);
  }
  return mergeDemoContracts(real);
}

// DEPLOY_CONTRACT — demo communities (name starts with "Demo") are intercepted
// and synthesised locally. All other deploys go to the real backend.
export async function deployContract({
  serverUrl,
  publicKey,
  name,
  contract,
  code,
  profile,
}: {
  serverUrl: string;
  publicKey: string;
  name: string;
  contract: string;
  code: string;
  profile?: string;
}) {
  const mock = await tryMockDeployContract({ serverUrl, publicKey, name, contract, code, profile });
  if (mock.handled) return mock.result;

  // Construct contractData object with defaults
  const contractData = {
    id: '',
    name,
    contract,
    code,
    protocol: 'BFT',
    default_app: '',
    pid: publicKey,
    address: serverUrl,
    group: [],
    threshold: 0,
    profile: profile || null,
    constructor: {},
  };
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractData),
    },
    30000
  );
}

// JOIN_CONTRACT
export async function joinContract({
  serverUrl,
  publicKey,
  address,
  agent,
  contract,
  profile = '',
}: {
  serverUrl: string;
  publicKey: string;
  address: string;
  agent: string;
  contract: string;
  profile?: string;
}) {
  if (isDemoContract(contract)) return mockJoinContract();
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=join_contract`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, agent, contract, profile }),
    }
  );
}

// CONTRACT WRITE
export async function contractWrite({
  serverUrl,
  publicKey,
  contractId,
  method,
}: {
  serverUrl: string;
  publicKey: string;
  contractId: string;
  method: IMethod;
}) {
  if (isDemoContract(contractId)) {
    return mockContractWrite({ serverUrl, publicKey, contractId, method });
  }
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}/${contractId}/${method.name}?action=contract_write`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(method),
    }
  );
}

// CONTRACT READ
export async function contractRead({
  serverUrl,
  publicKey,
  contractId,
  method,
}: {
  serverUrl: string;
  publicKey: string;
  contractId: string;
  method: IMethod;
}) {
  if (isDemoContract(contractId)) {
    return mockContractRead({ serverUrl, publicKey, contractId, method });
  }
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}/${contractId}/${method.name}?action=contract_read`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(method),
    }
  );
}
