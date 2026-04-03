// ---------------------------------------------------------------------------
// Budget allocation flow — persisted via contract API
// ---------------------------------------------------------------------------

import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

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

export interface FundLink {
  id: string;
  server: string;
  agent: string;
}

export interface BudgetState {
  items: BudgetItem[];
  allocations: ParticipantAllocation[];
  fundLink: FundLink | null;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

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

function normalizeFundLink(f: Record<string, unknown>): FundLink | null {
  if (!f || Object.keys(f).length === 0) return null;
  return {
    id: typeof f.id === 'string' ? f.id : String(f.id ?? ''),
    server: typeof f.server === 'string' ? f.server : '',
    agent: typeof f.agent === 'string' ? f.agent : '',
  };
}

// ---------------------------------------------------------------------------
// Async API
// ---------------------------------------------------------------------------

export async function loadBudget(server: string, agent: string, contractId: string): Promise<BudgetState> {
  const [rawItems, rawAllocations, rawFundLink] = await Promise.all([
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_items', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_all_allocations', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_fund_link', values: {} } as IMethod }),
  ]);

  const itemsArray: unknown[] = Array.isArray(rawItems) ? rawItems : [];
  const items = itemsArray.map(i => normalizeBudgetItem(i as Record<string, unknown>));

  const allocationsArray: unknown[] = Array.isArray(rawAllocations) ? rawAllocations : [];
  const allocations = allocationsArray.map(a => normalizeAllocation(a as Record<string, unknown>));

  const fundLink = normalizeFundLink((rawFundLink as Record<string, unknown>) ?? {});

  return { items, allocations, fundLink };
}

export async function addItem(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  name: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'add_item',
      values: {
        item: {
          id: crypto.randomUUID(),
          name: name.trim(),
          createdBy: currentUser,
        },
      },
    } as IMethod,
  });
}

export async function saveMyAllocation(
  server: string,
  agent: string,
  contractId: string,
  allocation: Record<string, number>,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_my_allocation', values: { allocation } } as IMethod,
  });
}

export async function setFundLink(
  server: string,
  agent: string,
  contractId: string,
  fundLink: FundLink,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'set_fund_link',
      values: { fund_link: { id: fundLink.id, server: fundLink.server, agent: fundLink.agent } },
    } as IMethod,
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

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
