// ---------------------------------------------------------------------------
// Discussion flow — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

export interface Comment {
  id: string;
  author: string;
  text: string;
  parentId: string | null; // null = top-level
  timestamp: number;
}

export const CURRENT_USER = 'me';

// ---------------------------------------------------------------------------
// Per-instance store (keyed by instanceId)
// ---------------------------------------------------------------------------
const SEED_DATA: Comment[] = [
  { id: 'c1', author: 'alice', text: 'I think we should prioritise outreach to younger members of the community.', parentId: null, timestamp: Date.now() - 3_600_000 * 6 },
  { id: 'c2', author: 'bob',   text: 'Agreed — social media is underutilised.', parentId: 'c1', timestamp: Date.now() - 3_600_000 * 5 },
  { id: 'c3', author: 'alice', text: 'Exactly, a short video series could work well.', parentId: 'c2', timestamp: Date.now() - 3_600_000 * 4 },
  { id: 'c4', author: 'carol', text: 'What about budget constraints? We should discuss that too.', parentId: null, timestamp: Date.now() - 3_600_000 * 3 },
  { id: 'c5', author: 'bob',   text: 'Good point. Let\'s schedule a dedicated session for finances.', parentId: 'c4', timestamp: Date.now() - 3_600_000 * 2 },
];

const commentsByInstance = new Map<string, Comment[]>();

function getStore(instanceId: string): Comment[] {
  if (!commentsByInstance.has(instanceId)) {
    commentsByInstance.set(instanceId, SEED_DATA.map(c => ({ ...c })));
  }
  return commentsByInstance.get(instanceId)!;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function getComments(instanceId: string): Comment[] {
  return getStore(instanceId).map(c => ({ ...c }));
}

export function addComment(instanceId: string, text: string, parentId: string | null): Comment {
  const store = getStore(instanceId);
  const c: Comment = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    author: CURRENT_USER,
    text: text.trim(),
    parentId,
    timestamp: Date.now(),
  };
  store.push(c);
  return { ...c };
}

export function deleteComment(instanceId: string, id: string): void {
  const store = getStore(instanceId);
  // Only the author can delete; removes node and all descendants
  const toRemove = new Set<string>();
  const collect = (tid: string) => {
    toRemove.add(tid);
    store.filter(c => c.parentId === tid).forEach(c => collect(c.id));
  };
  collect(id);
  const filtered = store.filter(c => !toRemove.has(c.id));
  commentsByInstance.set(instanceId, filtered);
}
