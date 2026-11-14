import { contractRead, contractWrite, deployContract } from '../api';
import type { IMethod } from '../interfaces';
import { needsApproval } from '@ouripoupko/ibc';
import { getApp, readSilently, writeSilently } from '../ibc';
import { eventStreamService } from '../eventStream';
import type { BlockchainEvent } from '../eventStream';
import communitySource from '../../assets/contracts/Community.sol?raw';
import initiativeContractCode from '../../assets/contracts/initiative_contract.py?raw';
import wishContractCode from '../../assets/contracts/wish_contract.py?raw';
import agreementContractCode from '../../assets/contracts/agreement_contract.py?raw';

/**
 * Community contract interface
 * Handles all community-specific contract calls
 */

/** Logs every call this file makes to the community contract: the wrapper
 * function in community.ts, the contract method it invokes, and the
 * parameters sent. */
function logCommunityCall(tsFunction: string, contractMethod: string, params: unknown): void {
  console.log(`[community.ts] ${tsFunction} -> community_contract.${contractMethod}`, params);
}

/** Logs the return value of a read call to the community contract. */
function logCommunityResult(tsFunction: string, contractMethod: string, result: unknown): void {
  console.log(`[community.ts] ${tsFunction} <- community_contract.${contractMethod}`, result);
}

/** The label community contracts are deployed with, by which they are found again. */
export const COMMUNITY_CONTRACT_NAME = 'communities-community';

export interface CommunityProperties {
  name: string;
  description: string;
  createdAt: number; // unix seconds
  creator: string;
}

/** A member, and where others find them: their node, and their profile contract there. */
export interface CommunityMember {
  agent: string;
  node: string;
  profile: string;
}

/**
 * Deploys a community contract, with the user as its first member. Opens the
 * node's approval page, so call it from a click.
 */
export async function createCommunity(
  node: string,
  profile: string | null,
  name: string,
  description: string,
): Promise<string> {
  const values = { name, description, node, profile: profile ?? '' };
  logCommunityCall('createCommunity', 'constructor', values);
  return await getApp().deploy({ source: communitySource, name: COMMUNITY_CONTRACT_NAME, constructor: values });
}

/**
 * Whether the user already has a community's contract on their node, even
 * one the app may not read yet (the node then says it needs approval).
 */
export async function hasCommunityContract(contractId: string): Promise<boolean> {
  const ibc = getApp().ibc;
  if (!ibc) return false;
  try {
    return Boolean((await ibc.contract(contractId))?.id);
  } catch (error) {
    if (needsApproval(error)) return true;
    throw error;
  }
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

/**
 * Joins a community's contract through a member's node, as a partner (the
 * user's node keeps a copy and takes part in consensus) or as a guest (it
 * uses the member's copy). The user approves on their node, in one approval,
 * the join (of the community's source, which the members check), and this
 * app's permissions for that source; so call it from a click. Resolves with
 * the outcome, which the node reports as a join_contract event.
 */
export async function joinCommunityContract(
  contractId: string,
  memberNode: string,
  memberAgent: string,
  guest: boolean,
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
    id = await getApp().join(contractId, memberNode, memberAgent, { source: communitySource, guest });
    const event = seen.find((e) => e.request === id) ?? await new Promise<BlockchainEvent>((resolve, reject) => {
      onOutcome = resolve;
      timer = setTimeout(() => reject(new Error(
        'Your node has not finished joining yet. Check the community on your node\'s page, and open Communities again later.',
      )), JOIN_TIMEOUT_MS);
    });
    return { joined: event.reply === true, sourceCheck: event.source_check, reason: event.reason };
  } finally {
    clearTimeout(timer);
    eventStreamService.removeEventListener('join_contract', listener);
  }
}

/**
 * Becomes a member of a community whose contract the user joined. With
 * silently, never asks: it fails (needsAccess) unless the user let the app
 * call join() without asking; otherwise it asks if needed, so call it from a
 * click.
 */
export async function joinCommunity(
  contractId: string,
  node: string,
  profile: string | null,
  { silently = false } = {},
): Promise<void> {
  const values = { node, profile: profile ?? '' };
  logCommunityCall('joinCommunity', 'join', values);
  if (silently) await writeSilently(contractId, 'join', values);
  else await getApp().write(contractId, 'join', values);
}

export async function getProperties(contractId: string): Promise<CommunityProperties> {
  const result = await readSilently(contractId, 'getProperties') as CommunityProperties;
  logCommunityResult('getProperties', 'getProperties', result);
  return result;
}

export async function getMembers(contractId: string): Promise<CommunityMember[]> {
  const result = await readSilently(contractId, 'getMembers') as CommunityMember[];
  logCommunityResult('getMembers', 'getMembers', result);
  return result;
}

export interface Collaboration {
  id: string;
  type: 'initiative' | 'wish' | 'agreement';
  title: string;
  description?: string;
  dreamNeed?: string;
  rule?: string;
  protection?: string;
  currencyGathered?: number;
  currencyGoal?: number;
  consensusStatus?: string;
  createdAt: number;
  activityCount?: number;
  hostServer?: string;
  hostAgent?: string;
  author?: string;
}

/**
 * Read the parent community credentials stored in a collaboration contract
 * (initiative, wish, or agreement). Note: this targets the collaboration's
 * own contract, not the community contract, so it is not logged here.
 */
export async function getCommunity(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<{ server: string; agent: string; id: string } | null> {
  try {
    const result = await contractRead({
      serverUrl,
      publicKey,
      contractId,
      method: { name: 'get_community', values: {} } as IMethod,
    });
    if (!result || typeof result !== 'object') return null;
    const r = result as Record<string, unknown>;
    return {
      server: String(r.server ?? ''),
      agent:  String(r.agent  ?? ''),
      id:     String(r.id     ?? ''),
    };
  } catch {
    return null;
  }
}

/**
 * Create an initiative (deploy contract + add to community)
 */
export async function createInitiative(
  serverUrl: string,
  publicKey: string,
  communityId: string,
  initiative: { title: string; description?: string },
) {
  const response = await deployContract({
    serverUrl,
    publicKey,
    name: initiative.title,
    contract: 'initiative_contract.py',
    code: initiativeContractCode,
    constructorArgs: { community_server: serverUrl, community_agent: publicKey, community_id: communityId },
  });
  const initiativeId = (response as { id?: string }).id || (response as string);

  const details = {
    title: initiative.title,
    description: initiative.description || '',
    createdAt: Date.now(),
    currencyGoal: 100,
    currencyGathered: 0,
    activityCount: 0,
  };
  // Targets the initiative's own contract, not the community contract.
  await contractWrite({
    serverUrl,
    publicKey,
    contractId: initiativeId,
    method: {
      name: 'set_details',
      values: { details },
    } as IMethod,
  });

  const collaboration: Collaboration = {
    id: initiativeId,
    type: 'initiative',
    title: initiative.title,
    description: initiative.description,
    currencyGathered: 0,
    currencyGoal: 100,
    createdAt: Date.now(),
    activityCount: 0,
    hostServer: serverUrl,
    hostAgent: publicKey,
  };
  // addCollaboration logs its own community contract call.
  await addCollaboration(serverUrl, publicKey, communityId, collaboration);
  return initiativeId;
}

/**
 * Create a wish (deploy contract + add to community)
 */
export async function createWish(
  serverUrl: string,
  publicKey: string,
  communityId: string,
  wish: { title: string; dreamNeed?: string },
): Promise<string> {
  const response = await deployContract({
    serverUrl,
    publicKey,
    name: wish.title,
    contract: 'wish_contract.py',
    code: wishContractCode,
    constructorArgs: { community_server: serverUrl, community_agent: publicKey, community_id: communityId },
  });
  const wishId = (response as { id?: string }).id || (response as string);

  const collaboration: Collaboration = {
    id: wishId,
    type: 'wish',
    title: wish.title,
    dreamNeed: wish.dreamNeed,
    author: publicKey,
    createdAt: Date.now(),
    activityCount: 0,
    hostServer: serverUrl,
    hostAgent: publicKey,
  };
  // addCollaboration logs its own community contract call.
  await addCollaboration(serverUrl, publicKey, communityId, collaboration);
  return wishId;
}

/**
 * Create an agreement (deploy contract + add to community)
 */
export async function createAgreement(
  serverUrl: string,
  publicKey: string,
  communityId: string,
  agreement: { title: string; rule?: string; protection?: string },
): Promise<string> {
  const response = await deployContract({
    serverUrl,
    publicKey,
    name: agreement.rule || agreement.title,
    contract: 'agreement_contract.py',
    code: agreementContractCode,
    constructorArgs: { community_server: serverUrl, community_agent: publicKey, community_id: communityId },
  });
  const agreementId = (response as { id?: string }).id || (response as string);

  const collaboration: Collaboration = {
    id: agreementId,
    type: 'agreement',
    title: agreement.rule || agreement.title,
    rule: agreement.rule,
    protection: agreement.protection,
    consensusStatus: 'Pending',
    createdAt: Date.now(),
    activityCount: 0,
    hostServer: serverUrl,
    hostAgent: publicKey,
  };
  // addCollaboration logs its own community contract call.
  await addCollaboration(serverUrl, publicKey, communityId, collaboration);
  return agreementId;
}

/**
 * Add a collaboration (initiative, wish, or agreement) to the community
 */
export async function addCollaboration(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  collaboration: Collaboration,
) {
  logCommunityCall('addCollaboration', 'add_collaboration', { collaboration });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_collaboration',
      values: { collaboration },
    } as IMethod,
  });
}

/**
 * Get all collaborations from the community
 */
export async function getCollaborations(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  logCommunityCall('getCollaborations', 'get_collaborations', {});
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_collaborations',
      values: {},
    } as IMethod,
  });
  logCommunityResult('getCollaborations', 'get_collaborations', result);
  return result;
}

/**
 * Approve an agent for community membership
 */
export async function approveAgent(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  agentPublicKey: string,
) {
  logCommunityCall('approveAgent', 'approve', { approved: agentPublicKey });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: contractId,
    method: {
      name: 'approve',
      values: { approved: agentPublicKey },
    } as IMethod,
  });
}

/**
 * Disapprove an agent for community membership
 */
export async function disapproveAgent(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  agentPublicKey: string,
) {
  logCommunityCall('disapproveAgent', 'disapprove', { disapproved: agentPublicKey });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'disapprove',
      values: { disapproved: agentPublicKey },
    } as IMethod,
  });
}

export async function transfer(
  server: string,
  agent: string,
  contract: string,
  to: string,
  value: number
) {
  logCommunityCall('transfer', 'transfer', { to, value });
  return await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId: contract,
    method: {
      name: 'transfer',
      values: { to, value },
    } as IMethod,
  });
}

export interface IAccountDetails {
  [account: string]: {
    type: string;
    balance: number;
    name?: string;
    signers?: string[];
    threshold?: number;
  };
}

export async function getAccountDetails(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<IAccountDetails> {
  logCommunityCall('getAccountDetails', 'get_account_details', {});
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_account_details', values: {} } as IMethod,
  });
  logCommunityResult('getAccountDetails', 'get_account_details', result);
  return (result as IAccountDetails) ?? {};
}

export async function createFundAccount(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  name: string,
  owner: string,
): Promise<boolean> {
  logCommunityCall('createFundAccount', 'create_fund_account', { name, owner });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'create_fund_account', values: { name, owner } } as IMethod,
  });
}

/**
 * Public accounts (community-owned accounts with authorized signers + threshold)
 */

export async function addSigner(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  account: string,
  signer: string,
): Promise<boolean> {
  logCommunityCall('addSigner', 'add_signer', { account, signer });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_signer', values: { account, signer } } as IMethod,
  });
}

export async function removeSigner(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  account: string,
  signer: string,
): Promise<boolean> {
  logCommunityCall('removeSigner', 'remove_signer', { account, signer });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'remove_signer', values: { account, signer } } as IMethod,
  });
}

/**
 * Generic monetary policies
 */

export type PolicySideKind = 'void' | 'account' | 'everyPersonal' | 'everyAccount';

export interface IPolicySide {
  kind: PolicySideKind;
  account?: string;
}

export type PolicyMode = 'units' | 'percent';
export type PolicyRateType = 'community-governed' | 'self-set';

export interface Policy {
  id: string;
  name: string;
  description?: string;
  source: IPolicySide;
  destination: IPolicySide;
  mode: PolicyMode;
  rateType: PolicyRateType;
  creator: string;
  selfRate?: number | null;
  createdAt: number;
  lastAppliedTime: number;
  elapsedTicks: number;
  currentRate: number;
}

export async function createPolicy(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  policy: {
    id: string;
    name: string;
    description?: string;
    source: IPolicySide;
    destination: IPolicySide;
    mode: PolicyMode;
    rateType: PolicyRateType;
    selfRate?: number | null;
  },
): Promise<string> {
  logCommunityCall('createPolicy', 'create_policy', { policy });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'create_policy', values: { policy } } as IMethod,
  });
}

export async function getPolicies(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<Policy[]> {
  logCommunityCall('getPolicies', 'get_policies', {});
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_policies', values: {} } as IMethod,
  });
  logCommunityResult('getPolicies', 'get_policies', result);
  return (result as Policy[]) ?? [];
}

/**
 * A community-governed policy's rate is the live median of every member's
 * standing preference, tracked via the generic `parameters()` runtime
 * mechanism (each contract-partner's own value per string key, aggregated
 * into a median) - one dynamically-named key per policy: `p_<policyId>`.
 */
export interface IContractParameters {
  medians: Record<string, number>;
  parameters: Record<string, number>;
}

export function policyParameterKey(policyId: string): string {
  return `p_${policyId}`;
}

export async function getContractParameters(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<IContractParameters> {
  logCommunityCall('getContractParameters', 'get_parameters', {});
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_parameters', values: {} } as IMethod,
  });
  logCommunityResult('getContractParameters', 'get_parameters', result);
  return (result as IContractParameters) ?? { medians: {}, parameters: {} };
}

export async function setPolicyPreference(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  policyId: string,
  value: number,
): Promise<boolean> {
  logCommunityCall('setPolicyPreference', 'set_policy_preference', {
    values: { policy_id: policyId },
    parameters: { [policyParameterKey(policyId)]: value },
  });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_policy_preference',
      values: { policy_id: policyId },
      parameters: { [policyParameterKey(policyId)]: value },
    } as IMethod,
  });
}

export async function setCommitmentRate(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  policyId: string,
  value: number,
): Promise<boolean> {
  logCommunityCall('setCommitmentRate', 'set_commitment_rate', { policy_id: policyId, value });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'set_commitment_rate', values: { policy_id: policyId, value } } as IMethod,
  });
}

export async function setPolicyDetails(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  policyId: string,
  name: string,
  description: string,
): Promise<boolean> {
  logCommunityCall('setPolicyDetails', 'set_policy_details', { policy_id: policyId, name, description });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'set_policy_details', values: { policy_id: policyId, name, description } } as IMethod,
  });
}

export async function deletePolicy(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  policyId: string,
): Promise<boolean> {
  logCommunityCall('deletePolicy', 'delete_policy', { policy_id: policyId });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'delete_policy', values: { policy_id: policyId } } as IMethod,
  });
}

/**
 * Wallet payments - generic over immediate (1-of-1) and pending (N-of-M) outcomes.
 */

export type PaymentStatus = 'completed' | 'pending' | 'failed';

export interface IPayment {
  id?: string;
  status: PaymentStatus;
  fromAccount?: string;
  to?: string;
  value?: number;
  approvals?: string[];
  threshold?: number;
  reason?: string;
}

export async function sendPayment(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  fromAccount: string,
  to: string,
  value: number,
): Promise<IPayment> {
  logCommunityCall('sendPayment', 'send_payment', { from_account: fromAccount, to, value });
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'send_payment', values: { from_account: fromAccount, to, value } } as IMethod,
  });
}

