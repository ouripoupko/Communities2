import { contractRead } from '../../../../services/api';
import { resolveInitiativeStageContract } from '../../../../services/contracts/initiative';
import type { IMethod } from '../../../../services/interfaces';

// Per-stage compact summaries fetched from the initiative's sub-contracts.
// Each function returns `null` when the sub-contract can't be resolved or
// the read fails (old initiatives, missing registrations, network hiccups).
// Callers render a single summary line or hide it silently.

export interface ProblemSummary { up: number; down: number; total: number; }
export interface DiscussionSummary { participants: number; comments: number; }
export interface ProposalsSummary { proposals: number; topApprovedText: string | null; topApprovedCount: number; }
export interface VoteSummary { winnerText: string | null; winnerCredits: number; voters: number; }

async function readMethod(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  method: string,
  values: Record<string, unknown> = {},
): Promise<unknown> {
  return contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: method, values } as IMethod,
  });
}

export async function fetchProblemSummary(
  serverUrl: string,
  publicKey: string,
  initiativeId: string,
): Promise<ProblemSummary | null> {
  try {
    const stage = await resolveInitiativeStageContract(serverUrl, publicKey, initiativeId, 'problemVoteContractId');
    if (!stage?.contractId) return null;
    const raw = await readMethod(serverUrl, publicKey, stage.contractId, 'get_tally');
    if (!raw || typeof raw !== 'object') return null;
    const t = raw as { up?: number; down?: number; total?: number };
    return {
      up: Number(t.up ?? 0),
      down: Number(t.down ?? 0),
      total: Number(t.total ?? 0),
    };
  } catch {
    return null;
  }
}

export async function fetchDiscussionSummary(
  serverUrl: string,
  publicKey: string,
  initiativeId: string,
): Promise<DiscussionSummary | null> {
  try {
    const stage = await resolveInitiativeStageContract(serverUrl, publicKey, initiativeId, 'discussionContractId');
    if (!stage?.contractId) return null;
    const raw = await readMethod(serverUrl, publicKey, stage.contractId, 'get_comments');
    if (!raw || typeof raw !== 'object') return null;
    const comments = raw as Record<string, { author?: string; deleted?: boolean }>;
    const authors = new Set<string>();
    let liveCount = 0;
    for (const c of Object.values(comments)) {
      if (c.deleted) continue;
      liveCount += 1;
      if (typeof c.author === 'string' && c.author) authors.add(c.author);
    }
    return { participants: authors.size, comments: liveCount };
  } catch {
    return null;
  }
}

export async function fetchProposalsSummary(
  serverUrl: string,
  publicKey: string,
  initiativeId: string,
): Promise<ProposalsSummary | null> {
  try {
    const stage = await resolveInitiativeStageContract(serverUrl, publicKey, initiativeId, 'proposalsContractId');
    if (!stage?.contractId) return null;
    const [proposalsRaw, countsRaw] = await Promise.all([
      readMethod(serverUrl, publicKey, stage.contractId, 'get_proposals'),
      readMethod(serverUrl, publicKey, stage.contractId, 'get_approval_counts'),
    ]);
    const proposals = (proposalsRaw && typeof proposalsRaw === 'object' ? proposalsRaw : {}) as Record<string, { text?: string }>;
    const counts = (countsRaw && typeof countsRaw === 'object' ? countsRaw : {}) as Record<string, number>;
    const entries = Object.entries(proposals)
      .map(([pid, p]) => ({ pid, text: String(p.text ?? ''), count: Number(counts[pid] ?? 0) }))
      .filter((e) => e.text);
    if (entries.length === 0) {
      return { proposals: 0, topApprovedText: null, topApprovedCount: 0 };
    }
    entries.sort((a, b) => b.count - a.count);
    const top = entries[0];
    return {
      proposals: entries.length,
      topApprovedText: top.text,
      topApprovedCount: top.count,
    };
  } catch {
    return null;
  }
}

export async function fetchVoteSummary(
  serverUrl: string,
  publicKey: string,
  initiativeId: string,
): Promise<VoteSummary | null> {
  try {
    const stage = await resolveInitiativeStageContract(serverUrl, publicKey, initiativeId, 'voteContractId');
    if (!stage?.contractId) return null;
    const [proposalsRaw, resultsRaw, allocationsRaw] = await Promise.all([
      readMethod(serverUrl, publicKey, stage.contractId, 'get_proposals'),
      readMethod(serverUrl, publicKey, stage.contractId, 'get_results'),
      readMethod(serverUrl, publicKey, stage.contractId, 'get_allocations'),
    ]);
    const proposals = (proposalsRaw && typeof proposalsRaw === 'object' ? proposalsRaw : {}) as Record<string, { text?: string }>;
    const results = (resultsRaw && typeof resultsRaw === 'object' ? resultsRaw : {}) as Record<string, number>;
    const allocations = (allocationsRaw && typeof allocationsRaw === 'object' ? allocationsRaw : {}) as Record<string, unknown>;
    const voters = Object.keys(allocations).length;
    let winnerId: string | null = null;
    let winnerCredits = 0;
    for (const [pid, votes] of Object.entries(results)) {
      const v = Number(votes ?? 0);
      if (v > winnerCredits) {
        winnerCredits = v;
        winnerId = pid;
      }
    }
    const winnerText = winnerId && proposals[winnerId] ? String(proposals[winnerId].text ?? '') : null;
    return { winnerText, winnerCredits, voters };
  } catch {
    return null;
  }
}
