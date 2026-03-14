import { contractRead, contractWrite } from '../api';
import type { IMethod } from '../interfaces';

/**
 * Initiative contract interface
 * Client builds JSON structures; contract stores and retrieves only
 */

export async function getInitiative(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_initiative', values: {} } as IMethod,
  });
  const r = result as { details?: Record<string, unknown>; contributions?: unknown[] };
  return { ...(r?.details ?? {}), contributions: r?.contributions ?? [] };
}

export async function addContribution(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  contributor: string,
  amount: number,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_contribution',
      values: { contribution: { contributor, amount } },
    } as IMethod,
  });
}

export async function getContributions(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_contributions', values: {} } as IMethod,
  });
}

// Roadmap: segments, edit proposals, votes
export async function getRoadmap(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_roadmap', values: {} } as IMethod,
  });
  const r = result as {
    segments?: Array<{ id: string; author: string; text: string }>;
    edit_proposals?: Array<{
      id: string;
      author: string;
      segment_ids?: string[];
      segmentIds?: string[];
      new_text?: string;
      newText?: string;
      status: string;
    }>;
    proposal_votes?: Array<{ proposal_id: string; voter: string; support: boolean }>;
    members?: string[];
  };
  const segments = r?.segments ?? [];
  const rawProposals = r?.edit_proposals ?? [];
  const votesList = r?.proposal_votes ?? [];
  const members = r?.members ?? [];

  // Build proposalVotes map from list
  const proposalVotes: Record<string, Record<string, boolean>> = {};
  for (const v of votesList) {
    const pid = v.proposal_id;
    if (!proposalVotes[pid]) proposalVotes[pid] = {};
    proposalVotes[pid][v.voter] = v.support;
  }

  const editProposals = rawProposals.map((p) => ({
    id: p.id,
    author: p.author,
    segmentIds: p.segmentIds ?? p.segment_ids ?? [],
    newText: p.newText ?? p.new_text ?? '',
    status: p.status as 'pending' | 'applied',
  }));

  return { segments, editProposals, proposalVotes, members };
}

export async function addSegment(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  author: string,
  text: string,
) {
  const segment = {
    id: crypto.randomUUID(),
    author,
    text,
  };
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_segment',
      values: { segment },
    } as IMethod,
  });
}

export async function createEditProposal(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalId: string,
  author: string,
  segmentIds: string[],
  newText: string,
) {
  const proposal = {
    id: proposalId,
    author,
    segment_ids: segmentIds,
    new_text: newText,
    status: 'pending',
  };
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_edit_proposal',
      values: { proposal },
    } as IMethod,
  });
}

export async function voteOnProposal(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalId: string,
  voter: string,
  support: boolean,
) {
  const vote = { proposal_id: proposalId, voter, support };
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_proposal_vote',
      values: { vote },
    } as IMethod,
  });
}

export async function applyProposal(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalId: string,
) {
  const roadmap = await getRoadmap(serverUrl, publicKey, contractId);
  const { segments, editProposals } = roadmap;

  const proposal = editProposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== 'pending') return;

  const segmentIds = proposal.segmentIds;
  const idsSet = new Set(segmentIds);
  const newSegment = {
    id: crypto.randomUUID(),
    author: proposal.author,
    text: proposal.newText,
  };

  const newSegments: Array<{ id: string; author: string; text: string }> = [];
  let replacing = false;
  for (const seg of segments) {
    if (idsSet.has(seg.id)) {
      if (!replacing) {
        newSegments.push(newSegment);
        replacing = true;
      }
      continue;
    }
    replacing = false;
    newSegments.push(seg);
  }

  const newProposals = editProposals.map((p) =>
    p.id === proposalId ? { ...p, status: 'applied' as const } : p,
  );

  // Persist using snake_case for contract
  const segmentsForContract = newSegments;
  const proposalsForContract = newProposals.map((p) => ({
    id: p.id,
    author: p.author,
    segment_ids: p.segmentIds,
    new_text: p.newText,
    status: p.status,
  }));

  await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_segments',
      values: { segments: segmentsForContract },
    } as IMethod,
  });
  await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_edit_proposals',
      values: { proposals: proposalsForContract },
    } as IMethod,
  });
}

export interface InitiativeGap {
  id: string;
  title: string;
  description: string;
}

export async function getGaps(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<InitiativeGap[]> {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_gaps', values: {} } as IMethod,
  });
  const arr = Array.isArray(result) ? result : [];
  return arr.map((g: Record<string, unknown>) => ({
    id: String(g.id ?? ''),
    title: String(g.title ?? ''),
    description: String(g.description ?? ''),
  }));
}

export async function addGap(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  title: string,
  description: string,
) {
  const gap = { id: crypto.randomUUID(), title, description };
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_gap', values: { gap } } as IMethod,
  });
}

export interface InitiativeStep {
  id: string;
  label: string;
  completed: boolean;
}

export async function getSteps(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<InitiativeStep[]> {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_steps', values: {} } as IMethod,
  });
  const arr = Array.isArray(result) ? result : [];
  return arr.map((s: Record<string, unknown>) => ({
    id: String(s.id ?? ''),
    label: String(s.label ?? ''),
    completed: Boolean(s.completed ?? false),
  }));
}

export async function addStep(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  label: string,
) {
  const step = { id: crypto.randomUUID(), label, completed: false };
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_step', values: { step } } as IMethod,
  });
}
