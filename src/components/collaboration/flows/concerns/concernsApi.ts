// ---------------------------------------------------------------------------
// Concern resolution flow — persistent via contract
// ---------------------------------------------------------------------------

import { readSilently, write } from '../../../../services/ibc';

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
// Async API — the contract (ConcernsFlow.sol). A voter is whoever signs: the
// contract takes them from msg.sender.
// ---------------------------------------------------------------------------

const VOTES: (ConcernVote | null)[] = [null, 'support', 'reject', 'resolved'];

export async function loadConcerns(contractId: string): Promise<Concern[]> {
  const result = await readSilently(contractId, 'getConcerns') as {
    id: string; title: string; description: string; createdBy: string; createdAt: number; voters: string[]; votes: number[];
  }[];
  return result.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    createdBy: c.createdBy,
    createdAt: Number(c.createdAt) * 1000,
    votes: Object.fromEntries(c.voters.map((voter, i) => [voter, VOTES[Number(c.votes[i])]!])),
  }));
}

/** Raises a concern, which the user supports. May open the node's approval page: call it from a click. */
export async function addConcern(contractId: string, title: string, description: string): Promise<void> {
  await write(contractId, 'addConcern', { title: title.trim(), description: description.trim() });
}

/** Votes on a concern. May open the node's approval page: call it from a click. */
export async function voteConcern(contractId: string, concernId: string, v: ConcernVote): Promise<void> {
  await write(contractId, 'vote', { concernId, value: VOTES.indexOf(v) });
}

/** Takes the user's vote back. May open the node's approval page: call it from a click. */
export async function clearVoteConcern(contractId: string, concernId: string): Promise<void> {
  await write(contractId, 'vote', { concernId, value: 0 });
}
