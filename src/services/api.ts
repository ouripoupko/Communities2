// Real API utility for contract and server calls

import type { IMethod } from "./interfaces";

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

// DEPLOY_CONTRACT
export async function deployContract({
  serverUrl,
  publicKey,
  name,
  contract,
  code,
  profile,
  constructorArgs = {},
}: {
  serverUrl: string;
  publicKey: string;
  name: string;
  contract: string;
  code: string;
  profile?: string;
  constructorArgs?: Record<string, unknown>;
}) {
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
    constructor: constructorArgs,
  };
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractData),
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
  // Construct IMethod object
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
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}/${contractId}/${method.name}?action=contract_read`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(method),
    }
  );
}
