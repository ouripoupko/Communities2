// ---------------------------------------------------------------------------
// Concern resolution flow — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

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

export const CURRENT_USER = 'me';
const ALL_PARTICIPANTS = ['me', 'alice', 'bob', 'carol'];
export const COMMUNITY_SIZE = ALL_PARTICIPANTS.length;
const MAJORITY = Math.floor(COMMUNITY_SIZE / 2) + 1; // 3

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
let concerns: Concern[] = [
  {
    id: 'c1',
    title: 'Budget transparency is insufficient',
    description: 'Members cannot see how funds are allocated month to month.',
    createdBy: 'alice',
    createdAt: Date.now() - 3_600_000 * 48,
    votes: { alice: 'support', bob: 'support', carol: 'support' },
  },
  {
    id: 'c2',
    title: 'Decision-making process excludes newer members',
    description: 'Only founding members seem to have a real vote on major decisions.',
    createdBy: 'bob',
    createdAt: Date.now() - 3_600_000 * 24,
    votes: { alice: 'support', bob: 'support', carol: 'reject' },
  },
  {
    id: 'c3',
    title: 'Meeting frequency is too high',
    description: '',
    createdBy: 'carol',
    createdAt: Date.now() - 3_600_000 * 10,
    votes: { alice: 'reject', bob: 'reject', carol: 'support' },
  },
  {
    id: 'c4',
    title: 'Communication channels are fragmented',
    description: 'Too many platforms: email, Slack, WhatsApp — things get missed.',
    createdBy: 'me',
    createdAt: Date.now() - 3_600_000 * 6,
    votes: { me: 'support', alice: 'resolved', bob: 'resolved', carol: 'resolved' },
  },
];

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
// API
// ---------------------------------------------------------------------------

export function getConcerns(): Concern[] {
  return concerns.map(c => ({ ...c, votes: { ...c.votes } }));
}

export function addConcern(title: string, description: string): Concern {
  const c: Concern = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    title: title.trim(),
    description: description.trim(),
    createdBy: CURRENT_USER,
    createdAt: Date.now(),
    votes: { [CURRENT_USER]: 'support' }, // creator implicitly supports
  };
  concerns = [...concerns, c];
  return { ...c, votes: { ...c.votes } };
}

export function vote(concernId: string, v: ConcernVote): void {
  concerns = concerns.map(c =>
    c.id === concernId
      ? { ...c, votes: { ...c.votes, [CURRENT_USER]: v } }
      : c
  );
}

export function clearVote(concernId: string): void {
  concerns = concerns.map(c => {
    if (c.id !== concernId) return c;
    const { [CURRENT_USER]: _removed, ...rest } = c.votes;
    return { ...c, votes: rest };
  });
}
