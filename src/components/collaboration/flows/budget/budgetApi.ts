// ---------------------------------------------------------------------------
// Budget allocation flow — local in-memory store, no persistence yet
// Multi-instance: each tab instance has its own budget state, keyed by instanceId
// ---------------------------------------------------------------------------
import * as fundApi from '../fundraising/fundraisingApi';

export const CURRENT_USER = 'me';
export const TOTAL_POINTS = 1000;
const ALL_PARTICIPANTS = ['me', 'alice', 'bob', 'carol'];

export interface BudgetItem {
  id: string;
  name: string;
  createdBy: string;
}

/** participantId → itemId → points allocated */
export type AllocationMap = Record<string, Record<string, number>>;

export interface BudgetState {
  fundInstanceId: string | null;
  items: BudgetItem[];
  allocations: AllocationMap;
}

// Per-budget-instance state
const states = new Map<string, BudgetState>();

// Tracks which fund is claimed by which budget instance
// fundInstanceId → budgetInstanceId
const fundLinks = new Map<string, string>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function ensureState(instanceId: string): BudgetState {
  if (!states.has(instanceId)) {
    states.set(instanceId, { fundInstanceId: null, items: [], allocations: {} });
  }
  return states.get(instanceId)!;
}

function deepCopyState(s: BudgetState): BudgetState {
  return JSON.parse(JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// Public API — fund selection
// ---------------------------------------------------------------------------

/** Funds that are not yet claimed by any budget instance (or claimed by this one) */
export function getAvailableFunds(myInstanceId: string): { instanceId: string; name: string; totalRaised: number }[] {
  return fundApi.getAllConfiguredFunds().filter(f => {
    const claimedBy = fundLinks.get(f.instanceId);
    return !claimedBy || claimedBy === myInstanceId;
  });
}

/** True if there is at least one unclaimed configured fund */
export function hasAvailableFunds(): boolean {
  return fundApi.getAllConfiguredFunds().some(f => !fundLinks.has(f.instanceId));
}

export function linkFund(budgetInstanceId: string, fundInstanceId: string): void {
  // Release any previously linked fund for this budget instance
  for (const [fId, bId] of fundLinks.entries()) {
    if (bId === budgetInstanceId) fundLinks.delete(fId);
  }
  fundLinks.set(fundInstanceId, budgetInstanceId);
  const s = ensureState(budgetInstanceId);
  states.set(budgetInstanceId, { ...s, fundInstanceId });

  // Seed simulated allocations from other participants using the pre-existing items (if any)
  _seedSimulatedAllocations(budgetInstanceId);
}

// ---------------------------------------------------------------------------
// Public API — items & allocations
// ---------------------------------------------------------------------------

export function getState(instanceId: string): BudgetState {
  return deepCopyState(ensureState(instanceId));
}

export function addItem(instanceId: string, name: string): BudgetItem {
  const item: BudgetItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name: name.trim(),
    createdBy: CURRENT_USER,
  };
  const s = ensureState(instanceId);
  states.set(instanceId, { ...s, items: [...s.items, item] });
  _seedSimulatedAllocations(instanceId);
  return { ...item };
}

export function setAllocation(instanceId: string, itemId: string, points: number): void {
  const s = ensureState(instanceId);
  const userAllocations = { ...(s.allocations[CURRENT_USER] ?? {}), [itemId]: Math.max(0, points) };
  states.set(instanceId, {
    ...s,
    allocations: { ...s.allocations, [CURRENT_USER]: userAllocations },
  });
}

export function myPointsUsed(instanceId: string): number {
  const s = ensureState(instanceId);
  return Object.values(s.allocations[CURRENT_USER] ?? {}).reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface AggregatedItem {
  item: BudgetItem;
  totalPoints: number;
  percentage: number;   // normalized 0–100 across all items
  amount: number;       // percentage * totalRaised / 100
}

export function getAggregated(instanceId: string): AggregatedItem[] {
  const s = ensureState(instanceId);
  if (s.items.length === 0) return [];

  const fundInfo = s.fundInstanceId
    ? fundApi.getAllConfiguredFunds().find(f => f.instanceId === s.fundInstanceId)
    : null;
  const totalRaised = fundInfo?.totalRaised ?? 0;

  const totals = s.items.map(item => {
    const pts = ALL_PARTICIPANTS.reduce(
      (sum, p) => sum + (s.allocations[p]?.[item.id] ?? 0),
      0,
    );
    return { item, totalPoints: pts };
  });

  const grandTotal = totals.reduce((sum, t) => sum + t.totalPoints, 0);

  return totals
    .map(({ item, totalPoints }) => {
      const percentage = grandTotal > 0 ? (totalPoints / grandTotal) * 100 : 0;
      return {
        item,
        totalPoints,
        percentage,
        amount: (percentage / 100) * totalRaised,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// ---------------------------------------------------------------------------
// Seed simulated allocations from non-me participants
// (called after items are added or fund linked, so the results view looks alive)
// ---------------------------------------------------------------------------
function _seedSimulatedAllocations(instanceId: string): void {
  const s = ensureState(instanceId);
  if (s.items.length === 0) return;

  const simParticipants = ALL_PARTICIPANTS.filter(p => p !== CURRENT_USER);
  const newAllocations: AllocationMap = JSON.parse(JSON.stringify(s.allocations));

  simParticipants.forEach((p, pi) => {
    // Distribute 1000 points across items using a fixed but varied pattern
    const n = s.items.length;
    const pts: number[] = s.items.map((_, i) => {
      const base = Math.floor(TOTAL_POINTS / n);
      // Shift preference by participant index
      const bonus = i === (pi % n) ? TOTAL_POINTS - base * n : 0;
      return base + bonus;
    });
    newAllocations[p] = {};
    s.items.forEach((item, i) => { newAllocations[p][item.id] = pts[i]; });
  });

  states.set(instanceId, { ...s, allocations: newAllocations });
}
