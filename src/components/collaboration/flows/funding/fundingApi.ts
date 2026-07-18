// ---------------------------------------------------------------------------
// Funding flow — fundraising + budget allocation, persisted via contract API
// ---------------------------------------------------------------------------

import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';
import {
  transfer as communityTransfer,
  getAccountDetails as communityGetAccountDetails,
} from '../../../../services/contracts/community';

/** Logs every call this file makes to the funding flow contract, and the
 * raw reply, so a stuck/broken flow can be diagnosed from the console. */
function logFundingCall(tsFunction: string, contractMethod: string, params: unknown): void {
  console.log(`[fundingApi.ts] ${tsFunction} -> FundingFlow.${contractMethod}`, params);
}
function logFundingResult(tsFunction: string, contractMethod: string, result: unknown): void {
  console.log(`[fundingApi.ts] ${tsFunction} <- FundingFlow.${contractMethod}`, result);
}

// ---------------------------------------------------------------------------
// Fundraising types
// ---------------------------------------------------------------------------

export interface Contribution {
  id: string;
  participantId: string;
  amount: number;
  timestamp: number;
}

export interface FundConfig {
  name: string;
  description: string;
  goal: number | null;
}

export interface FundState {
  config: FundConfig | null;
  contributions: Contribution[];
}

export const CURRENCY_SYMBOL = 'credits';

// ---------------------------------------------------------------------------
// Budget allocation types
// ---------------------------------------------------------------------------

export const TOTAL_POINTS = 1000;

export interface BudgetItem {
  id: string;
  name: string;
  createdBy: string;
}

export interface ParticipantAllocation {
  participantId: string;
  allocation: Record<string, number>;
}

export interface BudgetState {
  items: BudgetItem[];
  allocations: ParticipantAllocation[];
}

export interface CommunityInfo {
  communityServer: string;
  communityAgent: string;
  communityId: string;
  fundAccountName: string;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeConfig(c: Record<string, unknown>): FundConfig {
  return {
    name: typeof c.name === 'string' ? c.name : '',
    description: typeof c.description === 'string' ? c.description : '',
    goal: typeof c.goal === 'number' ? c.goal : null,
  };
}

function normalizeContribution(c: Record<string, unknown>): Contribution {
  return {
    id: typeof c.id === 'string' ? c.id : String(c.id ?? ''),
    participantId: typeof c.participantId === 'string' ? c.participantId : '',
    amount: typeof c.amount === 'number' ? c.amount : Number(c.amount ?? 0),
    timestamp: typeof c.timestamp === 'number' ? c.timestamp : Number(c.timestamp ?? 0),
  };
}

function normalizeBudgetItem(i: Record<string, unknown>): BudgetItem {
  return {
    id: typeof i.id === 'string' ? i.id : String(i.id ?? ''),
    name: typeof i.name === 'string' ? i.name : '',
    createdBy: typeof i.createdBy === 'string' ? i.createdBy : '',
  };
}

function normalizeAllocation(a: Record<string, unknown>): ParticipantAllocation {
  const allocation = (a.allocation && typeof a.allocation === 'object' && !Array.isArray(a.allocation))
    ? (a.allocation as Record<string, unknown>)
    : {};
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(allocation)) {
    normalized[k] = typeof v === 'number' ? v : Number(v ?? 0);
  }
  return {
    participantId: typeof a.participantId === 'string' ? a.participantId : '',
    allocation: normalized,
  };
}

// ---------------------------------------------------------------------------
// Fundraising API
// ---------------------------------------------------------------------------

export async function loadFund(server: string, agent: string, contractId: string): Promise<FundState> {
  logFundingCall('loadFund', 'get_config', {});
  logFundingCall('loadFund', 'get_contributions', {});
  const [rawConfig, rawContributions] = await Promise.all([
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_config', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_contributions', values: {} } as IMethod }),
  ]);
  logFundingResult('loadFund', 'get_config', rawConfig);
  logFundingResult('loadFund', 'get_contributions', rawContributions);

  const configIsEmpty = !rawConfig || (typeof rawConfig === 'object' && Object.keys(rawConfig as object).length === 0);
  const config = configIsEmpty ? null : normalizeConfig(rawConfig as Record<string, unknown>);

  const contributionsArray: unknown[] = Array.isArray(rawContributions) ? rawContributions : [];
  const contributions = contributionsArray.map(c => normalizeContribution(c as Record<string, unknown>));

  return { config, contributions };
}

export async function configureFund(
  server: string,
  agent: string,
  contractId: string,
  name: string,
  description: string,
  goal: number | null,
): Promise<void> {
  const values = { config: { name: name.trim(), description: description.trim(), goal } };
  logFundingCall('configureFund', 'set_config', values);
  const result = await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_config', values } as IMethod,
  });
  logFundingResult('configureFund', 'set_config', result);
}

export async function loadCommunityInfo(
  server: string,
  agent: string,
  contractId: string,
): Promise<CommunityInfo | null> {
  try {
    logFundingCall('loadCommunityInfo', 'get_community', {});
    logFundingCall('loadCommunityInfo', 'get_fund_account_name', {});
    const [community, fundAccountName] = await Promise.all([
      contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_community', values: {} } as IMethod }),
      contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_fund_account_name', values: {} } as IMethod }),
    ]);
    logFundingResult('loadCommunityInfo', 'get_community', community);
    logFundingResult('loadCommunityInfo', 'get_fund_account_name', fundAccountName);
    const c = community as Record<string, unknown>;
    if (!c?.id) return null;
    return {
      communityServer:  String(c.server ?? ''),
      communityAgent:   String(c.agent  ?? ''),
      communityId:      String(c.id     ?? ''),
      fundAccountName:  String(fundAccountName ?? ''),
    };
  } catch (e) {
    console.log('[fundingApi.ts] loadCommunityInfo failed ->', e);
    return null;
  }
}

// The fund's real balance lives on the community contract's account
// ledger, not in this contract's own contribution records - those records
// only capture donations made through this Contribute form, and drift from
// the account's actual balance whenever someone funds it via a direct
// wallet transfer instead. Read the balance straight from the account.
export async function loadFundBalance(
  currentUser: string,
  communityInfo: CommunityInfo,
): Promise<number> {
  logFundingCall('loadFundBalance', 'get_account_details', { fundAccountName: communityInfo.fundAccountName });
  const details = await communityGetAccountDetails(communityInfo.communityServer, currentUser, communityInfo.communityId);
  logFundingResult('loadFundBalance', 'get_account_details', details);
  return details[communityInfo.fundAccountName]?.balance ?? 0;
}

export async function contribute(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  amount: number,
  communityInfo?: CommunityInfo,
): Promise<void> {
  if (communityInfo) {
    await communityTransfer(
      communityInfo.communityServer,
      currentUser,
      communityInfo.communityId,
      communityInfo.fundAccountName,
      amount,
    );
  }
  const values = {
    contribution: {
      id: crypto.randomUUID(),
      participantId: currentUser,
      amount,
      timestamp: Date.now(),
    },
  };
  logFundingCall('contribute', 'add_contribution', values);
  const result = await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_contribution', values } as IMethod,
  });
  logFundingResult('contribute', 'add_contribution', result);
}

// ---------------------------------------------------------------------------
// Budget allocation API
// ---------------------------------------------------------------------------

export async function loadBudget(server: string, agent: string, contractId: string): Promise<BudgetState> {
  logFundingCall('loadBudget', 'get_items', {});
  logFundingCall('loadBudget', 'get_all_allocations', {});
  const [rawItems, rawAllocations] = await Promise.all([
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_items', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_all_allocations', values: {} } as IMethod }),
  ]);
  logFundingResult('loadBudget', 'get_items', rawItems);
  logFundingResult('loadBudget', 'get_all_allocations', rawAllocations);

  const itemsArray: unknown[] = Array.isArray(rawItems) ? rawItems : [];
  const items = itemsArray.map(i => normalizeBudgetItem(i as Record<string, unknown>));

  const allocationsArray: unknown[] = Array.isArray(rawAllocations) ? rawAllocations : [];
  const allocations = allocationsArray.map(a => normalizeAllocation(a as Record<string, unknown>));

  return { items, allocations };
}

export async function addItem(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  name: string,
): Promise<void> {
  const values = {
    item: {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdBy: currentUser,
    },
  };
  logFundingCall('addItem', 'add_item', values);
  const result = await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_item', values } as IMethod,
  });
  logFundingResult('addItem', 'add_item', result);
}

export async function saveMyAllocation(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  allocation: Record<string, number>,
): Promise<void> {
  const values = { participant_id: currentUser, allocation };
  logFundingCall('saveMyAllocation', 'set_my_allocation', values);
  const result = await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_my_allocation', values } as IMethod,
  });
  logFundingResult('saveMyAllocation', 'set_my_allocation', result);
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function totalRaised(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amount, 0);
}

export function contributionByUser(contributions: Contribution[], participantId: string): number {
  return contributions
    .filter(c => c.participantId === participantId)
    .reduce((sum, c) => sum + c.amount, 0);
}

export function myPointsUsed(allocations: ParticipantAllocation[], currentUser: string): number {
  const mine = allocations.find(a => a.participantId === currentUser);
  if (!mine) return 0;
  return Object.values(mine.allocation).reduce((sum, v) => sum + v, 0);
}

export interface AggregatedItem {
  item: BudgetItem;
  totalPoints: number;
  percentage: number;
}

export function getAggregated(items: BudgetItem[], allocations: ParticipantAllocation[]): AggregatedItem[] {
  if (items.length === 0) return [];

  const totals = items.map(item => {
    const pts = allocations.reduce((sum, pa) => sum + (pa.allocation[item.id] ?? 0), 0);
    return { item, totalPoints: pts };
  });

  const grandTotal = totals.reduce((sum, t) => sum + t.totalPoints, 0);

  return totals
    .map(({ item, totalPoints }) => {
      const percentage = grandTotal > 0 ? (totalPoints / grandTotal) * 100 : 0;
      return { item, totalPoints, percentage };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}
