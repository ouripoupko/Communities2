import { joinAndWait, readSilently, writeSilently, write, deploy } from '../ibc';
import type { CallOptions, JoinOutcome } from '../ibc';
import { COMMUNITY_CONTRACT, communitySource, sourceOf } from './sources';

/**
 * The community contract's calls. A community is one ibc agreement: the
 * Community contract, which ibc deploys and joins, and the parts it creates
 * (Membership, Collaborations, Currency), which members call by their
 * addresses (at). Its source is the files of contracts/community/.
 */

type Part = 'membership' | 'collaborations' | 'currency';

// Each community's parts' addresses, read once (they never change).
const parts = new Map<string, Promise<Record<Part, string>>>();

/** Where a community's part is, to call it. */
async function at(communityId: string, part: Part): Promise<CallOptions> {
  let found = parts.get(communityId);
  if (!found) {
    found = readSilently(communityId, 'getParts') as Promise<Record<Part, string>>;
    parts.set(communityId, found);
    found.catch(() => parts.delete(communityId)); // read again next time
  }
  return { at: (await found)[part] };
}

/** The label community contracts are deployed with, by which they are found again. */
export const COMMUNITY_CONTRACT_NAME = 'communities-community';

export interface CommunityProperties {
  name: string;
  description: string;
  createdAt: number; // unix seconds
  creator: string;
  initialBalance: number; // what a new member's account starts with
  openJoin: boolean; // anyone joins at once; otherwise through the web of trust
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
  initialBalance: number,
  starterPolicies: boolean,
  openJoin: boolean,
): Promise<string> {
  const values = {
    name, description, node, profile: profile ?? '', initialBalance: toUnits(initialBalance), starterPolicies, openJoin,
  };
  return await deploy({
    source: communitySource, contract: COMMUNITY_CONTRACT, name: COMMUNITY_CONTRACT_NAME, constructor: values,
  });
}

/**
 * Joins a community's contract through a member's node, as a partner or as
 * a guest (see joinAndWait). Call it from a click.
 */
export async function joinCommunityContract(
  contractId: string,
  memberNode: string,
  memberAgent: string,
  guest: boolean,
): Promise<JoinOutcome> {
  return await joinAndWait(contractId, memberNode, memberAgent, {
    source: communitySource, guest, contractName: COMMUNITY_CONTRACT,
  });
}

/**
 * Asks to become a member of a community whose contract the user joined: a
 * member at once with open join, or else a nominee of the web of trust. With
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
  if (silently) await writeSilently(contractId, 'join', values, await at(contractId, 'membership'));
  else await write(contractId, 'join', values, await at(contractId, 'membership'));
}

export async function getProperties(contractId: string): Promise<CommunityProperties> {
  const result = await readSilently(contractId, 'getProperties') as CommunityProperties;
  return { ...result, initialBalance: fromUnits(result.initialBalance) };
}

export async function getMembers(contractId: string): Promise<CommunityMember[]> {
  const result = await readSilently(contractId, 'getMembers', {}, await at(contractId, 'membership')) as CommunityMember[];
  return result;
}

/** The kinds of collaboration, in the order the contracts number them. */
export const COLLABORATION_TYPES = ['initiative', 'wish', 'agreement'] as const;
export type CollaborationType = typeof COLLABORATION_TYPES[number];

/**
 * What the user writes of a collaboration: the community keeps the same
 * three texts for every kind, and each kind says what they mean (an
 * agreement's title is its rule, and its detail what harm it prevents).
 */
export interface CollaborationFields {
  title: string;
  description: string;
  detail: string;
}

/**
 * A collaboration, as the community lists it. Its contract (id) is on its
 * creator's node (hostServer, hostAgent), and holds its flows.
 */
export interface Collaboration extends CollaborationFields {
  id: string;
  type: CollaborationType;
  createdAt: number; // unix ms
  hostServer: string;
  hostAgent: string;
}

/**
 * Deploys a collaboration's contract on the user's node, for the community.
 * Opens the node's approval page, so call it from a click. Resolves with
 * its id; then list it in the community (listCollaboration).
 */
export async function deployCollaboration(communityId: string, type: CollaborationType, title: string): Promise<string> {
  const values = { kind_: COLLABORATION_TYPES.indexOf(type), title_: title, communityId_: communityId };
  return await deploy({ source: sourceOf('Collaboration.sol'), name: title, constructor: values });
}

/**
 * Lists a collaboration the user deployed in the community. With silently,
 * never asks: it fails (needsAccess) unless the user let the app call
 * addCollaboration without asking; otherwise it asks if needed, so call it
 * from a click.
 */
export async function listCollaboration(
  communityId: string,
  collaborationId: string,
  type: CollaborationType,
  fields: CollaborationFields,
  node: string,
  { silently = false } = {},
): Promise<void> {
  const values = { id: collaborationId, kind: COLLABORATION_TYPES.indexOf(type), ...fields, node };
  if (silently) await writeSilently(communityId, 'addCollaboration', values, await at(communityId, 'collaborations'));
  else await write(communityId, 'addCollaboration', values, await at(communityId, 'collaborations'));
}

export async function getCollaborations(contractId: string): Promise<Collaboration[]> {
  const result = await readSilently(contractId, 'getCollaborations', {}, await at(contractId, 'collaborations')) as {
    id: string; kind: number; title: string; description: string; detail: string; node: string; creator: string; createdAt: number;
  }[];
  return result.map((c) => ({
    id: c.id,
    type: COLLABORATION_TYPES[c.kind],
    title: c.title,
    description: c.description,
    detail: c.detail,
    createdAt: Number(c.createdAt) * 1000,
    hostServer: c.node,
    hostAgent: c.creator,
  }));
}

// ==================================================================
// WEB OF TRUST
// ==================================================================

/**
 * A nominee, their vouchers, and who approved whom: vouchedFor[i] (vouchers[i]
 * approved the nominee) and nomineeApproved[i] (the nominee approved vouchers[i]).
 * The nominee becomes a member once all approved each other.
 */
export interface Nomination {
  nominee: string;
  node: string;
  profile: string;
  vouchers: string[];
  vouchedFor: boolean[];
  nomineeApproved: boolean[];
}

export async function getNominations(contractId: string): Promise<Nomination[]> {
  const result = await readSilently(contractId, 'getNominations', {}, await at(contractId, 'membership')) as Nomination[];
  return result;
}

/**
 * Approves the other side of a nomination: the nominee approves a voucher,
 * or a voucher the nominee. May open the node's approval page: call it from a click.
 */
export async function approveAgent(contractId: string, other: string): Promise<void> {
  await write(contractId, 'approve', { other }, await at(contractId, 'membership'));
}

/** Cancels a nomination: the nominee, or one of their vouchers. Call it from a click. */
export async function disapproveAgent(contractId: string, other: string): Promise<void> {
  await write(contractId, 'disapprove', { other }, await at(contractId, 'membership'));
}

// ==================================================================
// CURRENCY (accounts, payments, monetary policies)
// ==================================================================
//
// The contract counts amounts in millionths of a unit (UNIT); the app
// works in units. Policies apply once a day (a tick), and the contract's
// balances are calculated up to a tick (see getCurrency and updateBalances).

const UNIT = 1_000_000;

/** Units to the contract's millionths, as a string (exact for large values). */
export function toUnits(amount: number): string {
  return String(Math.round(amount * UNIT));
}

/** The contract's millionths to units. */
export function fromUnits(value: number | string): number {
  return Number(value) / UNIT;
}

export type AccountKind = 'personal' | 'fund';

/** An account. A personal account's id is its member's agent id in lowercase; a fund's is its name. */
export interface Account {
  id: string;
  kind: AccountKind;
  name: string;
  owner: string;
  balance: number;
}

/** The id of a member's personal account. */
export function personalAccountId(agent: string): string {
  return agent.toLowerCase();
}

export async function getAccounts(contractId: string): Promise<Account[]> {
  const result = await readSilently(contractId, 'getAccounts', {}, await at(contractId, 'currency')) as {
    id: string; kind: number; name: string; owner: string; balance: number | string;
  }[];
  return result.map((a) => ({
    id: a.id, kind: a.kind === 0 ? 'personal' : 'fund', name: a.name, owner: a.owner, balance: fromUnits(a.balance),
  }));
}

/** Pays from the user's personal account. */
export async function pay(contractId: string, to: string, amount: number): Promise<void> {
  await write(contractId, 'pay', { to, amount: toUnits(amount) }, await at(contractId, 'currency'));
}

/**
 * Opens a fund's account, for a collaboration's flow: its id is the flow's.
 * Resolves with false if it is open already. Call it from a click.
 */
export async function createFundAccount(contractId: string, id: string, name: string, owner: string): Promise<boolean> {
  return (await write(contractId, 'createFundAccount', { id, name, owner }, await at(contractId, 'currency'))) === true;
}

/** A payment into a fund's account. */
export interface FundContribution {
  from: string;
  amount: number;
  time: number; // unix ms
}

/** The payments into a fund's account, as the community records them. */
export async function getContributions(contractId: string, fundId: string): Promise<FundContribution[]> {
  const result = await readSilently(contractId, 'getContributions', { fundId }, await at(contractId, 'currency')) as { from: string; amount: number | string; time: number }[];
  return result.map((c) => ({ from: c.from, amount: fromUnits(c.amount), time: Number(c.time) * 1000 }));
}

/** Where the balances stand: calculated up to settledTick, while the current tick is currentTick. */
export interface CurrencyState {
  tickSeconds: number;
  currentTick: number;
  settledTick: number;
  settledUntil: number; // unix ms: when settledTick fell
  pendingTicks: number;
  maxTicksPerUpdate: number;
  initialBalance: number;
}

export async function getCurrency(contractId: string): Promise<CurrencyState> {
  const r = await readSilently(contractId, 'getCurrency', {}, await at(contractId, 'currency')) as Record<string, number | string>;
  const currentTick = Number(r.currentTick);
  const settledTick = Number(r.settledTick);
  return {
    tickSeconds: Number(r.tickSeconds),
    currentTick,
    settledTick,
    settledUntil: Number(r.settledUntil) * 1000,
    pendingTicks: currentTick - settledTick,
    maxTicksPerUpdate: Number(r.maxTicksPerUpdate),
    initialBalance: fromUnits(r.initialBalance),
  };
}

/** Applies the policies to the days not calculated yet (a year of them at most). */
export async function updateBalances(contractId: string): Promise<void> {
  await write(contractId, 'updateBalances', {}, await at(contractId, 'currency'));
}

export type PolicySideKind = 'void' | 'account' | 'everyPersonal' | 'everyAccount';
const SIDE_KINDS: PolicySideKind[] = ['void', 'account', 'everyPersonal', 'everyAccount'];

export interface IPolicySide {
  kind: PolicySideKind;
  account?: string;
}

export type PolicyMode = 'units' | 'percent';
export type PolicyRateType = 'community-governed' | 'self-set';
const MODES: PolicyMode[] = ['units', 'percent'];
const RATE_TYPES: PolicyRateType[] = ['community-governed', 'self-set'];

/**
 * A policy. Each day it mints its rate into each destination, or takes its
 * rate (units, or percent of the balance) from each source, and burns it or
 * splits it equally among the destinations.
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  source: IPolicySide;
  destination: IPolicySide;
  mode: PolicyMode;
  rateType: PolicyRateType;
  creator: string;
  selfRate: number;
  currentRate: number; // a commitment's rate, or the median of the members' preferences
  createdAt: number; // unix ms
  preferences: number; // how many members set a preference
  myPreference: number | null;
}

type RawSide = { kind: number; account: string };
const sideFrom = (side: RawSide): IPolicySide =>
  SIDE_KINDS[side.kind] === 'account' ? { kind: 'account', account: side.account } : { kind: SIDE_KINDS[side.kind] };
const sideTo = (side: IPolicySide): RawSide => ({ kind: SIDE_KINDS.indexOf(side.kind), account: side.account ?? '' });

export async function getPolicies(contractId: string): Promise<Policy[]> {
  const result = await readSilently(contractId, 'getPolicies', {}, await at(contractId, 'currency')) as {
    id: number; name: string; description: string; source: RawSide; destination: RawSide; mode: number; rateType: number;
    creator: string; selfRate: number | string; currentRate: number | string; createdAt: number; preferences: number;
    hasMyPreference: boolean; myPreference: number | string;
  }[];
  return result.map((p) => ({
    id: String(p.id),
    name: p.name,
    description: p.description,
    source: sideFrom(p.source),
    destination: sideFrom(p.destination),
    mode: MODES[p.mode],
    rateType: RATE_TYPES[p.rateType],
    creator: p.creator,
    selfRate: fromUnits(p.selfRate),
    currentRate: fromUnits(p.currentRate),
    createdAt: Number(p.createdAt) * 1000,
    preferences: Number(p.preferences),
    myPreference: p.hasMyPreference ? fromUnits(p.myPreference) : null,
  }));
}

/**
 * Creates a policy. A commitment (self-set) pays from the user's own
 * account, at selfRate; the members set a community-governed policy's rate.
 */
export async function createPolicy(
  contractId: string,
  policy: {
    name: string;
    description?: string;
    source: IPolicySide;
    destination: IPolicySide;
    mode: PolicyMode;
    rateType: PolicyRateType;
    selfRate?: number;
  },
): Promise<void> {
  await write(contractId, 'createPolicy', {
    name: policy.name,
    description: policy.description ?? '',
    source: sideTo(policy.source),
    destination: sideTo(policy.destination),
    mode: MODES.indexOf(policy.mode),
    rateType: RATE_TYPES.indexOf(policy.rateType),
    selfRate: toUnits(policy.selfRate ?? 0),
  }, await at(contractId, 'currency'));
}

/** Sets the user's preference for a community-governed policy's rate. */
export async function setPolicyPreference(contractId: string, policyId: string, value: number): Promise<void> {
  await write(contractId, 'setPolicyPreference', { policyId, value: toUnits(value) }, await at(contractId, 'currency'));
}

/** Sets a commitment's rate: its creator only. */
export async function setCommitmentRate(contractId: string, policyId: string, value: number): Promise<void> {
  await write(contractId, 'setCommitmentRate', { policyId, value: toUnits(value) }, await at(contractId, 'currency'));
}

export async function setPolicyDetails(contractId: string, policyId: string, name: string, description: string): Promise<void> {
  await write(contractId, 'setPolicyDetails', { policyId, name, description }, await at(contractId, 'currency'));
}

/** Deletes a policy: its creator only, and a community-governed one once its rate is zero. */
export async function deletePolicy(contractId: string, policyId: string): Promise<void> {
  await write(contractId, 'deletePolicy', { policyId }, await at(contractId, 'currency'));
}
