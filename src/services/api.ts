// UI-only mock backend. All network calls are intercepted and answered locally.
// The real Gloki backend is owned by Ouri on a separate branch; this branch
// ships hardcoded UI for review and demos only.
//
// All public function signatures are unchanged so callers (slices, flow APIs,
// contract wrappers) keep working without edits.

import type { IMethod, IContract } from "./interfaces";
import {
  ensureDefaultDemoCommunity,
  mockContractRead,
  mockContractWrite,
  mockDeployAny,
  mockJoinContract,
  mergeDemoContracts,
} from "./demo/mockApi";

const FAKE_AGENT_DELAY = 50;
const FAKE_DEPLOY_DELAY = 200;

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function isExistAgent({
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}): Promise<any> {
  void publicKey;
  return delay(FAKE_AGENT_DELAY, true);
}

export async function registerAgent({
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}): Promise<any> {
  void publicKey;
  return delay(FAKE_AGENT_DELAY, true);
}

export async function getContracts({
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}): Promise<IContract[]> {
  ensureDefaultDemoCommunity(publicKey);
  return mergeDemoContracts([]);
}

export async function deployContract({
  publicKey,
  name,
  contract,
}: {
  serverUrl: string;
  publicKey: string;
  name: string;
  contract: string;
  code: string;
  profile?: string;
}): Promise<any> {
  const result = mockDeployAny({ publicKey, name, contract });
  return delay(FAKE_DEPLOY_DELAY, result);
}

export async function joinContract({
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
  address: string;
  agent: string;
  contract: string;
  profile?: string;
}): Promise<any> {
  void publicKey;
  return mockJoinContract();
}

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
}): Promise<any> {
  return mockContractWrite({ serverUrl, publicKey, contractId, method });
}

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
}): Promise<any> {
  return mockContractRead({ serverUrl, publicKey, contractId, method });
}
