import { readSilently, write } from '../../../../services/ibc';
import { ACCEPTANCE_BAR_ID } from './types';
import type { Proposal, ParticipantRanking } from './types';
export type { Proposal, ParticipantRanking } from './types';

// The ranking flow's contract (RankingFlow.sol): its topic, set when it is
// deployed, the proposals, and each participant's ranking. A participant is
// whoever signs: the contract takes them from msg.sender.

export interface TopicConfig {
  topic: string;
  description: string;
}

/** The deploy's constructor arguments: the flow's title is its topic. */
export const rankingConstructor = (config: Record<string, unknown>) => ({
  topic_: String(config.title ?? ''),
  description: String(config.description ?? ''),
});

export async function loadTopic(contractId: string): Promise<TopicConfig | null> {
  const r = await readSilently(contractId, 'getTopic') as TopicConfig;
  return r?.topic ? { topic: r.topic, description: r.description } : null;
}

export async function loadProposals(contractId: string): Promise<Proposal[]> {
  const result = await readSilently(contractId, 'getProposals') as { id: string; text: string; author: string }[];
  return result.map((p) => ({ id: p.id, text: p.text, author: p.author }));
}

export async function loadAllRankings(contractId: string): Promise<ParticipantRanking[]> {
  const result = await readSilently(contractId, 'getRankings') as { participant: string; order: string[] }[];
  return result.map((r) => ({ participantId: r.participant, order: r.order }));
}

/** The user's ranking, with proposals they have not ranked yet at the bottom. */
export function myRanking(rankings: ParticipantRanking[], currentUser: string, proposals: Proposal[]): string[] {
  const mine = rankings.find((r) => r.participantId.toLowerCase() === currentUser.toLowerCase());
  // Default: acceptance bar first, then all proposals
  const order = mine ? mine.order : [ACCEPTANCE_BAR_ID, ...proposals.map((p) => p.id)];
  // Proposals added after this participant last saved their ranking aren't
  // in the stored order yet - append them at the bottom instead of
  // silently leaving them out of the list.
  const known = new Set(order);
  const unranked = proposals.map((p) => p.id).filter((id) => !known.has(id));
  return [...order, ...unranked];
}

/** Proposes an option. May open the node's approval page: call it from a click. */
export async function addProposal(contractId: string, text: string): Promise<void> {
  await write(contractId, 'addProposal', { text: text.trim() });
}

/** Saves the user's ranking. May open the node's approval page: call it from a click. */
export async function saveMyRanking(contractId: string, order: string[]): Promise<void> {
  await write(contractId, 'setMyRanking', { order });
}
