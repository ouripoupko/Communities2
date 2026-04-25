// Mock discussion_contract.py — threaded comments with categories.
import type { IMethod } from '../../interfaces';
import { readState, updateState } from '../demoState';

interface DiscussionComment {
  id: string;
  author: string;
  text: string;
  parentId: string | null;
  timestamp: number;
  category?: 'evidence' | 'impact' | 'solutions' | 'concerns';
  deleted?: boolean;
}

interface DiscussionState {
  comments: DiscussionComment[];
}

function defaultState(): DiscussionState {
  return { comments: [] };
}

function load(contractId: string): DiscussionState {
  return { ...defaultState(), ...readState<Partial<DiscussionState>>(contractId) };
}

function newId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

export function discussionRead(contractId: string, method: IMethod, _caller: string): unknown {
  void _caller;
  const s = load(contractId);
  switch (method.name) {
    case 'get_comments':
      return s.comments;
    case 'get_participant_count':
      return new Set(s.comments.filter((c) => !c.deleted).map((c) => c.author)).size;
    case 'get_summary':
      return {
        participants: new Set(s.comments.filter((c) => !c.deleted).map((c) => c.author)).size,
        commentCount: s.comments.filter((c) => !c.deleted).length,
      };
    default:
      return null;
  }
}

export function discussionWrite(contractId: string, method: IMethod, caller: string): unknown {
  switch (method.name) {
    case 'add_comment': {
      const text = method.values?.text as string | undefined;
      if (!text) return null;
      const comment: DiscussionComment = {
        id: newId(),
        author: caller,
        text,
        parentId: (method.values?.parentId as string | null | undefined) ?? null,
        timestamp: Date.now(),
        category: method.values?.category as DiscussionComment['category'],
      };
      updateState<DiscussionState>(contractId, (s) => ({
        ...defaultState(),
        ...s,
        comments: [...(s.comments ?? []), comment],
      }));
      return comment;
    }
    case 'delete_comment': {
      const id = method.values?.id as string | undefined;
      if (!id) return null;
      updateState<DiscussionState>(contractId, (s) => ({
        ...defaultState(),
        ...s,
        comments: (s.comments ?? []).map((c) =>
          c.id === id && c.author === caller ? { ...c, deleted: true, text: '' } : c,
        ),
      }));
      return null;
    }
    default:
      return null;
  }
}
