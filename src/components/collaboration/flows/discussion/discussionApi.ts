import { readSilently, write } from '../../../../services/ibc';

export interface Comment {
  id: string;
  author: string;
  text: string;
  parentId: string | null;
  timestamp: number;
}

// The discussion's contract (DiscussionFlow.sol). An author is whoever signs:
// the contract takes them from msg.sender.

/** The comments to show: not deleted, and not under a deleted one. */
export async function loadComments(contractId: string): Promise<Comment[]> {
  const result = await readSilently(contractId, 'getComments') as {
    id: string; author: string; text: string; parent: string; timestamp: number; deleted: boolean;
  }[];
  const byId = new Map(result.map((c) => [c.id, c]));
  const hidden = (id: string): boolean => {
    for (let c = byId.get(id); c; c = c.parent ? byId.get(c.parent) : undefined) if (c.deleted) return true;
    return false;
  };
  return result.filter((c) => !hidden(c.id)).map((c) => ({
    id: c.id,
    author: c.author,
    text: c.text,
    parentId: c.parent || null,
    timestamp: Number(c.timestamp) * 1000,
  }));
}

/** Comments, as a reply to parentId (null at the top). May open the node's approval page: call it from a click. */
export async function addComment(contractId: string, text: string, parentId: string | null): Promise<void> {
  await write(contractId, 'addComment', { text: text.trim(), parent: parentId ?? '' });
}

/** Deletes the user's comment, and so the replies under it. May open the node's approval page: call it from a click. */
export async function deleteComment(contractId: string, id: string): Promise<void> {
  await write(contractId, 'deleteComment', { id });
}
