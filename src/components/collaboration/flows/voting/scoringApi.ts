// ---------------------------------------------------------------------------
// Scoring flow — persisted via contract API
// ---------------------------------------------------------------------------

import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export interface ScoringOption {
  id: string;
  text: string;
}

/** One participant's scores: optionId → numeric score */
export interface ParticipantScores {
  participantId: string;
  scores: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeOption(o: Record<string, unknown>): ScoringOption {
  return {
    id: String(o['id'] ?? ''),
    text: String(o['text'] ?? ''),
  };
}

function normalizeScores(s: Record<string, unknown>): ParticipantScores {
  let scores: Record<string, number>;
  const raw = s['scores'];
  if (typeof raw === 'string') {
    try {
      scores = JSON.parse(raw) as Record<string, number>;
    } catch {
      scores = {};
    }
  } else if (raw && typeof raw === 'object') {
    scores = raw as Record<string, number>;
  } else {
    scores = {};
  }
  return {
    participantId: String(s['participantId'] ?? ''),
    scores,
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function loadOptions(
  server: string,
  agent: string,
  contractId: string,
): Promise<ScoringOption[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_options', values: {} } as IMethod,
  });
  if (!Array.isArray(result)) return [];
  return (result as Record<string, unknown>[]).map(normalizeOption);
}

export async function loadAllScores(
  server: string,
  agent: string,
  contractId: string,
): Promise<ParticipantScores[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_all_scores', values: {} } as IMethod,
  });
  if (!Array.isArray(result)) return [];
  return (result as Record<string, unknown>[]).map(normalizeScores);
}

export async function loadMyScores(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
): Promise<Record<string, number>> {
  const all = await loadAllScores(server, agent, contractId);
  const mine = all.find(p => p.participantId === currentUser);
  return mine ? mine.scores : {};
}

export async function addOption(
  server: string,
  agent: string,
  contractId: string,
  text: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_option', values: { option: { id: crypto.randomUUID(), text: text.trim() } } } as IMethod,
  });
}

export async function saveMyScores(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  scores: Record<string, number>,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_my_scores', values: { participant_id: currentUser, scores } } as IMethod,
  });
}
