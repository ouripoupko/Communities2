// ---------------------------------------------------------------------------
// Funding flow — fundraising + budget allocation, persisted via contract API
// ---------------------------------------------------------------------------

import { readSilently, write } from '../../../../services/ibc';
import {
  pay as communityPay,
  getAccounts as communityGetAccounts,
  getContributions as communityGetContributions,
  createFundAccount as communityCreateFundAccount,
  toUnits,
  fromUnits,
} from '../../../../services/contracts/community';

// The funding flow's contract (FundingFlow.sol) has the fund's description and
// goal, and the budget. The money is in the community: the fund's account
// there has this flow's id, and the community records each payment into it.

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

/** Where the fund's money is: its community, and its account there (the flow's id). */
export interface CommunityInfo {
  communityId: string;
  fundId: string;
}

/** The deploy's constructor arguments, from the setup dialog, and the collaboration's community. */
export const fundingConstructor = (config: Record<string, unknown>, context: { communityId: string }) => ({
  name: String(config.name ?? ''),
  description: String(config.description ?? ''),
  goal: toUnits(typeof config.goal === 'number' ? config.goal : 0),
  communityId: context.communityId,
});

export async function loadFundConfig(contractId: string): Promise<{ config: FundConfig; communityId: string }> {
  const f = await readSilently(contractId, 'getFund') as { name: string; description: string; goal: number | string; communityId: string };
  const goal = fromUnits(f.goal);
  return { config: { name: f.name, description: f.description, goal: goal > 0 ? goal : null }, communityId: f.communityId };
}

/** The fund's account in the community: whether it is open, its balance, and the payments into it. */
export async function loadFundAccount(info: CommunityInfo): Promise<{ open: boolean; balance: number; contributions: Contribution[] }> {
  const [accounts, payments] = await Promise.all([
    communityGetAccounts(info.communityId),
    communityGetContributions(info.communityId, info.fundId),
  ]);
  const account = accounts.find((a) => a.id === info.fundId);
  const contributions = payments.map((p, i) => ({ id: String(i), participantId: p.from, amount: p.amount, timestamp: p.time }));
  return { open: !!account, balance: account?.balance ?? 0, contributions };
}

/** Opens the fund's account in the community. May open the node's approval page: call it from a click. */
export async function openFund(info: CommunityInfo, name: string, owner: string): Promise<void> {
  await communityCreateFundAccount(info.communityId, info.fundId, name, owner);
}

/** Pays into the fund's account. May open the node's approval page: call it from a click. */
export async function contribute(info: CommunityInfo, amount: number): Promise<void> {
  await communityPay(info.communityId, info.fundId, amount);
}

export async function loadBudget(contractId: string): Promise<BudgetState> {
  const [items, allocations] = await Promise.all([
    readSilently(contractId, 'getItems') as Promise<{ id: string; name: string; createdBy: string }[]>,
    readSilently(contractId, 'getAllocations') as Promise<{ participant: string; itemIds: string[]; points: (number | string)[] }[]>,
  ]);
  return {
    items: items.map((i) => ({ id: i.id, name: i.name, createdBy: i.createdBy })),
    allocations: allocations.map((a) => ({
      participantId: a.participant,
      allocation: Object.fromEntries(a.itemIds.map((id, i) => [id, Number(a.points[i])])),
    })),
  };
}

/** Adds a budget item. May open the node's approval page: call it from a click. */
export async function addItem(contractId: string, name: string): Promise<void> {
  await write(contractId, 'addItem', { name: name.trim() });
}

/** Saves the user's allocation (TOTAL_POINTS at most). May open the node's approval page: call it from a click. */
export async function saveMyAllocation(contractId: string, allocation: Record<string, number>): Promise<void> {
  const entries = Object.entries(allocation).filter(([, v]) => v > 0);
  await write(contractId, 'setMyAllocation', { itemIds: entries.map(([id]) => id), points: entries.map(([, v]) => v) });
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
