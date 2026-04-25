// Mock merge_contract.py — cross-initiative merge proposals + voting.
import type { IMethod } from '../../interfaces';
import { readState, updateState } from '../demoState';

interface MergeProposal {
  id: string;
  sourceInitiativeId: string;
  rationale: string;
  proposer: string;
  decision: 'pending' | 'accepted' | 'rejected';
  votes: Record<string, 'support' | 'oppose'>;
  createdAt: number;
}

interface MergeState {
  proposals: MergeProposal[];
}

function defaultState(): MergeState {
  return { proposals: [] };
}

function load(contractId: string): MergeState {
  return { ...defaultState(), ...readState<Partial<MergeState>>(contractId) };
}

function newId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

export function mergeRead(contractId: string, method: IMethod, caller: string): unknown {
  const s = load(contractId);
  switch (method.name) {
    case 'get_merge_proposals':
      return s.proposals;
    case 'get_my_vote': {
      const mergeId = method.values?.merge_id as string | undefined;
      const proposal = s.proposals.find((p) => p.id === mergeId);
      return proposal ? proposal.votes[caller] ?? null : null;
    }
    default:
      return null;
  }
}

export function mergeWrite(contractId: string, method: IMethod, caller: string): unknown {
  switch (method.name) {
    case 'propose_merge': {
      const sourceInitiativeId = method.values?.source_initiative_id as string | undefined;
      const rationale = method.values?.rationale as string | undefined;
      if (!sourceInitiativeId || !rationale) return { error: 'Missing source or rationale' };
      const proposal: MergeProposal = {
        id: newId(),
        sourceInitiativeId,
        rationale,
        proposer: caller,
        decision: 'pending',
        votes: {},
        createdAt: Date.now(),
      };
      updateState<MergeState>(contractId, (s) => ({
        ...defaultState(),
        ...s,
        proposals: [...(s.proposals ?? []), proposal],
      }));
      return proposal;
    }
    case 'vote_on_merge': {
      const mergeId = method.values?.merge_id as string | undefined;
      const vote = method.values?.vote as 'support' | 'oppose' | undefined;
      if (!mergeId || !vote) return { error: 'Missing merge_id or vote' };
      let result: unknown = null;
      updateState<MergeState>(contractId, (s) => ({
        ...defaultState(),
        ...s,
        proposals: (s.proposals ?? []).map((p) => {
          if (p.id !== mergeId) return p;
          if (p.decision !== 'pending') {
            result = { error: 'Already decided' };
            return p;
          }
          return { ...p, votes: { ...p.votes, [caller]: vote } };
        }),
      }));
      return result;
    }
    case 'author_decide_merge': {
      const mergeId = method.values?.merge_id as string | undefined;
      const decision = method.values?.decision as 'accepted' | 'rejected' | undefined;
      if (!mergeId || !decision) return { error: 'Missing merge_id or decision' };
      updateState<MergeState>(contractId, (s) => ({
        ...defaultState(),
        ...s,
        proposals: (s.proposals ?? []).map((p) =>
          p.id === mergeId && p.decision === 'pending' ? { ...p, decision } : p,
        ),
      }));
      return null;
    }
    default:
      return null;
  }
}
