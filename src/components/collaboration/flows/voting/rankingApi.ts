import { ACCEPTANCE_BAR_ID } from './types';
import type { Proposal, ParticipantRanking } from './types';

// ---------------------------------------------------------------------------
// Local in-memory store — no persistence yet
// ---------------------------------------------------------------------------

const proposals: Proposal[] = [
  { id: 'p1', text: 'Allocate budget to infrastructure' },
  { id: 'p2', text: 'Hire two new engineers' },
  { id: 'p3', text: 'Launch marketing campaign' },
  { id: 'p4', text: 'Expand to new regions' },
];

// Simulated rankings from other participants (used for aggregation)
const otherRankings: ParticipantRanking[] = [
  {
    participantId: 'alice',
    order: ['p1', ACCEPTANCE_BAR_ID, 'p2', 'p3', 'p4'],
  },
  {
    participantId: 'bob',
    order: ['p2', 'p3', ACCEPTANCE_BAR_ID, 'p1', 'p4'],
  },
  {
    participantId: 'carol',
    order: ['p3', 'p1', ACCEPTANCE_BAR_ID, 'p4', 'p2'],
  },
];

let myRanking: ParticipantRanking = {
  participantId: 'me',
  order: [ACCEPTANCE_BAR_ID, 'p1', 'p2', 'p3', 'p4'],
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function getProposals(): Proposal[] {
  return [...proposals];
}

export function addProposal(text: string): Proposal {
  const newProposal: Proposal = { id: `p${Date.now()}`, text };
  proposals.push(newProposal);
  // Place new proposal below the acceptance bar in the current user's ranking
  myRanking = { ...myRanking, order: [...myRanking.order, newProposal.id] };
  return newProposal;
}

export function getMyRanking(): ParticipantRanking {
  return { ...myRanking };
}

export function saveMyRanking(order: string[]): void {
  myRanking = { ...myRanking, order };
}

/** Returns rankings from all participants including the current user */
export function getAllRankings(): ParticipantRanking[] {
  return [myRanking, ...otherRankings];
}
