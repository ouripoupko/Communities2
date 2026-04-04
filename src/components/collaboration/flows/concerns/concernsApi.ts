// ---------------------------------------------------------------------------
// Concern resolution flow — persistent via contract
// ---------------------------------------------------------------------------

import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export type ConcernVote = 'support' | 'reject' | 'resolved';

export interface Concern {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: number;
  /** participantId → vote */
  votes: Record<string, ConcernVote>;
}

export type ConcernStatus = 'active' | 'resolved' | 'rejected';

export const MAJORITY = 3; // configurable later

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalizeConcern(raw: unknown): Concern {
  const r = raw as Record<string, unknown>;
  const rawVotes = r['votes'];
  const votes: Record<string, ConcernVote> =
    rawVotes && typeof rawVotes === 'object' && !Array.isArray(rawVotes)
      ? (rawVotes as Record<string, ConcernVote>)
      : {};
  return {
    id:          String(r['id'] ?? ''),
    title:       String(r['title'] ?? ''),
    description: String(r['description'] ?? ''),
    createdBy:   String(r['createdBy'] ?? ''),
    createdAt:   Number(r['createdAt'] ?? 0),
    votes,
  };
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function voteCounts(c: Concern): { support: number; reject: number; resolved: number; total: number } {
  const support  = Object.values(c.votes).filter(v => v === 'support').length;
  const reject   = Object.values(c.votes).filter(v => v === 'reject').length;
  const resolved = Object.values(c.votes).filter(v => v === 'resolved').length;
  return { support, reject, resolved, total: support + reject + resolved };
}

/** 0–1: fraction of voters who support (treat no votes as 0) */
export function supportWeight(c: Concern): number {
  const { support, total } = voteCounts(c);
  return total === 0 ? 0 : support / total;
}

export function concernStatus(c: Concern): ConcernStatus {
  const { reject, resolved } = voteCounts(c);
  if (resolved >= MAJORITY) return 'resolved';
  if (reject   >= MAJORITY) return 'rejected';
  return 'active';
}

// ---------------------------------------------------------------------------
// Async API
// ---------------------------------------------------------------------------

export async function loadConcerns(server: string, agent: string, contractId: string): Promise<Concern[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_concerns', values: {} } as IMethod,
  });
  const items: unknown[] = Array.isArray(result) ? result : [];
  return items.map(normalizeConcern);
}

export async function addConcern(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  title: string,
  description: string,
): Promise<void> {
  const newConcern: Concern = {
    id:          crypto.randomUUID(),
    title:       title.trim(),
    description: description.trim(),
    createdBy:   currentUser,
    createdAt:   Date.now(),
    votes:       { [currentUser]: 'support' },
  };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_concern', values: { concern: newConcern } } as IMethod,
  });
}

export async function voteConcern(
  server: string,
  agent: string,
  contractId: string,
  concerns: Concern[],
  concernId: string,
  currentUser: string,
  v: ConcernVote,
): Promise<void> {
  const updated = concerns.map(c =>
    c.id === concernId
      ? { ...c, votes: { ...c.votes, [currentUser]: v } }
      : c,
  );
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_concerns', values: { concerns: updated } } as IMethod,
  });
}

export async function clearVoteConcern(
  server: string,
  agent: string,
  contractId: string,
  concerns: Concern[],
  concernId: string,
  currentUser: string,
): Promise<void> {
  const updated = concerns.map(c => {
    if (c.id !== concernId) return c;
    const { [currentUser]: _removed, ...rest } = c.votes;
    return { ...c, votes: rest };
  });
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_concerns', values: { concerns: updated } } as IMethod,
  });
}
