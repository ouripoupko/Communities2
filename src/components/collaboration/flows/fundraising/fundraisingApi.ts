// ---------------------------------------------------------------------------
// Fundraising flow — local in-memory store, no persistence yet
// Multi-instance: each tab instance has its own fund, keyed by instanceId
// ---------------------------------------------------------------------------

export interface Contribution {
  id: string;
  participantId: string;
  amount: number;
  timestamp: number;
}

export interface FundState {
  name: string | null;        // short fund title (shown in budget allocation list)
  description: string;        // longer "what the fund is for" text
  goal: number | null;
  contributions: Contribution[];
}

export const CURRENT_USER = 'me';
export const CURRENCY_SYMBOL = 'credits';

// Wallet balances — shared across all fund instances (one wallet per user)
const balances: Record<string, number> = {
  me:    150,
  alice: 200,
  bob:   120,
  carol: 80,
};

// Per-instance state map
const funds = new Map<string, FundState>();

function ensureFund(instanceId: string): FundState {
  if (!funds.has(instanceId)) {
    funds.set(instanceId, { name: null, description: '', goal: null, contributions: [] });
  }
  return funds.get(instanceId)!;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function getFund(instanceId: string): FundState {
  const f = ensureFund(instanceId);
  return { ...f, contributions: f.contributions.map(c => ({ ...c })) };
}

export function configureFund(
  instanceId: string,
  name: string,
  description: string,
  goal: number | null,
): void {
  const existing = ensureFund(instanceId);
  funds.set(instanceId, { ...existing, name: name.trim(), description: description.trim(), goal });
}

export function getBalance(participantId: string): number {
  return balances[participantId] ?? 0;
}

export function contribute(
  instanceId: string,
  amount: number,
): { ok: true } | { ok: false; reason: string } {
  if (amount <= 0) return { ok: false, reason: 'Amount must be positive.' };
  const balance = balances[CURRENT_USER] ?? 0;
  if (amount > balance) {
    return { ok: false, reason: `Insufficient balance (${balance} ${CURRENCY_SYMBOL} available).` };
  }
  balances[CURRENT_USER] = balance - amount;
  const f = ensureFund(instanceId);
  const contribution: Contribution = {
    id: `c_${Date.now()}`,
    participantId: CURRENT_USER,
    amount,
    timestamp: Date.now(),
  };
  funds.set(instanceId, { ...f, contributions: [...f.contributions, contribution] });
  return { ok: true };
}

export function totalRaised(instanceId: string): number {
  return ensureFund(instanceId).contributions.reduce((sum, c) => sum + c.amount, 0);
}

export function contributionByUser(instanceId: string, participantId: string): number {
  return ensureFund(instanceId).contributions
    .filter(c => c.participantId === participantId)
    .reduce((sum, c) => sum + c.amount, 0);
}

/** Returns all configured (named) fund instances — used by the budget allocation flow */
export function getAllConfiguredFunds(): { instanceId: string; name: string; totalRaised: number }[] {
  return Array.from(funds.entries())
    .filter(([, f]) => f.name !== null)
    .map(([instanceId, f]) => ({
      instanceId,
      name: f.name!,
      totalRaised: f.contributions.reduce((sum, c) => sum + c.amount, 0),
    }));
}
