import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';
import { ACCEPTANCE_BAR_ID } from './types';
export type { Proposal, ParticipantRanking } from './types';

// ---------------------------------------------------------------------------
// Async API — persistent via contract
// ---------------------------------------------------------------------------

export async function loadProposals(server: string, agent: string, contractId: string): Promise<import('./types').Proposal[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_proposals', values: {} } as IMethod,
  });
  const items: unknown[] = Array.isArray(result) ? result : [];
  return items.map((raw) => {
    const r = raw as Record<string, unknown>;
    return { id: String(r['id'] ?? ''), text: String(r['text'] ?? '') };
  });
}

export async function loadMyRanking(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  proposals: import('./types').Proposal[],
): Promise<string[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_rankings', values: {} } as IMethod,
  });
  const items: unknown[] = Array.isArray(result) ? result : [];
  const mine = items.find((raw) => {
    const r = raw as Record<string, unknown>;
    return r['participantId'] === currentUser;
  });
  if (mine) {
    const r = mine as Record<string, unknown>;
    const order = r['order'];
    return Array.isArray(order) ? (order as string[]) : [];
  }
  // Default: acceptance bar first, then all proposals
  return [ACCEPTANCE_BAR_ID, ...proposals.map((p) => p.id)];
}

export async function loadAllRankings(server: string, agent: string, contractId: string): Promise<import('./types').ParticipantRanking[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_rankings', values: {} } as IMethod,
  });
  const items: unknown[] = Array.isArray(result) ? result : [];
  return items.map((raw) => {
    const r = raw as Record<string, unknown>;
    const order = r['order'];
    return {
      participantId: String(r['participantId'] ?? ''),
      order: Array.isArray(order) ? (order as string[]) : [],
    };
  });
}

export async function addProposal(server: string, agent: string, contractId: string, text: string): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'add_proposal',
      values: { proposal: { id: crypto.randomUUID(), text: text.trim() } },
    } as IMethod,
  });
}

export async function saveMyRanking(server: string, agent: string, contractId: string, currentUser: string, order: string[]): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_my_ranking', values: { participant_id: currentUser, order } } as IMethod,
  });
}
