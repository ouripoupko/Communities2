import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export interface Comment {
  id: string;
  author: string;
  text: string;
  parentId: string | null;
  timestamp: number;
}

function normalizeComment(c: Record<string, unknown>): Comment {
  return {
    id:        String(c.id        ?? ''),
    author:    String(c.author    ?? ''),
    text:      String(c.text      ?? ''),
    parentId:  c.parentId != null && c.parentId !== '' ? String(c.parentId) : null,
    timestamp: Number(c.timestamp ?? 0),
  };
}

export async function loadComments(
  server: string,
  agent: string,
  contractId: string,
): Promise<Comment[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_comments', values: {} } as IMethod,
  });
  const raw = Array.isArray(result) ? result : [];
  return (raw as Record<string, unknown>[]).map(normalizeComment);
}

export async function addComment(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  text: string,
  parentId: string | null,
): Promise<void> {
  const comment: Comment = {
    id:        crypto.randomUUID(),
    author:    currentUser,
    text:      text.trim(),
    parentId,
    timestamp: Date.now(),
  };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_comment', values: { comment } } as IMethod,
  });
}

export async function deleteComment(
  server: string,
  agent: string,
  contractId: string,
  comments: Comment[],
  id: string,
): Promise<void> {
  const toRemove = new Set<string>();
  const collect = (tid: string) => {
    toRemove.add(tid);
    comments.filter(c => c.parentId === tid).forEach(c => collect(c.id));
  };
  collect(id);
  const updated = comments.filter(c => !toRemove.has(c.id));
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_comments', values: { comments: updated } } as IMethod,
  });
}
