// ---------------------------------------------------------------------------
// Scoring flow — its contract (ScoringFlow.sol): a topic, set when it is
// deployed, options, and each participant's scores (0 to 10). A participant
// is whoever signs: the contract takes them from msg.sender.
// ---------------------------------------------------------------------------

import { readSilently, write } from '../../../../services/ibc';

export interface ScoringOption {
  id: string;
  text: string;
}

/** One participant's scores: optionId → numeric score */
export interface ParticipantScores {
  participantId: string;
  scores: Record<string, number>;
}

export interface TopicConfig {
  topic: string;
  description: string;
}

/** The deploy's constructor arguments, from the setup dialog's topic. */
export const scoringConstructor = (config: Record<string, unknown>) => ({
  topic_: String(config.title ?? ''), // the flow's title is its topic
  description: String(config.description ?? ''),
});

export async function loadTopic(contractId: string): Promise<TopicConfig | null> {
  const r = await readSilently(contractId, 'getTopic') as TopicConfig;
  return r?.topic ? { topic: r.topic, description: r.description } : null;
}

export async function loadOptions(contractId: string): Promise<ScoringOption[]> {
  const result = await readSilently(contractId, 'getOptions') as { id: string; text: string }[];
  return result.map((o) => ({ id: o.id, text: o.text }));
}

export async function loadAllScores(contractId: string): Promise<ParticipantScores[]> {
  const result = await readSilently(contractId, 'getScores') as { participant: string; optionIds: string[]; values: number[] }[];
  return result.map((s) => ({
    participantId: s.participant,
    scores: Object.fromEntries(s.optionIds.map((id, i) => [id, Number(s.values[i])])),
  }));
}

/** The user's scores, from everyone's. */
export function myScores(all: ParticipantScores[], currentUser: string): Record<string, number> {
  return all.find((p) => p.participantId.toLowerCase() === currentUser.toLowerCase())?.scores ?? {};
}

/** Proposes an option. May open the node's approval page: call it from a click. */
export async function addOption(contractId: string, text: string): Promise<void> {
  await write(contractId, 'addOption', { text: text.trim() });
}

/** Saves the user's scores; options without a score (NaN) are left out. */
export async function saveMyScores(contractId: string, scores: Record<string, number>): Promise<void> {
  const scored = Object.entries(scores).filter(([, v]) => !isNaN(v));
  await write(contractId, 'setMyScores', {
    optionIds: scored.map(([id]) => id),
    values: scored.map(([, v]) => Math.round(v)),
  });
}
