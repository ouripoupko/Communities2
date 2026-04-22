import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export type CommentCategory = 'evidence' | 'impact' | 'solutions' | 'concerns';

export interface Comment {
  id: string;
  author: string;
  text: string;
  parentId: string | null;
  timestamp: number;
  category?: CommentCategory;
  deleted?: boolean;
}

interface RawComment {
  id?: string;
  author?: string;
  text?: string;
  parentId?: string | null;
  timestamp?: number | string;
  category?: CommentCategory | '' | null;
  deleted?: boolean;
}

function normalizeTimestamp(raw: number | string | undefined): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string' || !raw) return 0;

  // Gloki's `timestamp()` returns a packed digit string: YYYYMMDDHHMMSS + fractional digits.
  // Parse to a JS epoch ms if we can, else fall through.
  if (/^\d{14,}$/.test(raw)) {
    const year = parseInt(raw.slice(0, 4), 10);
    const month = parseInt(raw.slice(4, 6), 10) - 1;
    const day = parseInt(raw.slice(6, 8), 10);
    const hour = parseInt(raw.slice(8, 10), 10);
    const minute = parseInt(raw.slice(10, 12), 10);
    const second = parseInt(raw.slice(12, 14), 10);
    const fractional = raw.slice(14);
    const millis = fractional ? Math.floor(parseInt(fractional.padEnd(6, '0').slice(0, 6), 10) / 1000) : 0;
    const ms = Date.UTC(year, month, day, hour, minute, second, millis);
    if (!Number.isNaN(ms)) return ms;
  }

  const parsed = Number(raw);
  if (!Number.isNaN(parsed)) return parsed;
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) return asDate;
  return 0;
}

function normalizeComment(raw: RawComment): Comment {
  const deleted = !!raw.deleted;
  return {
    id: String(raw.id ?? ''),
    author: String(raw.author ?? ''),
    text: deleted ? '[deleted]' : String(raw.text ?? ''),
    parentId: raw.parentId ? String(raw.parentId) : null,
    timestamp: normalizeTimestamp(raw.timestamp),
    category: raw.category ? (raw.category as CommentCategory) : undefined,
    deleted,
  };
}

export async function addComment(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  text: string,
  parentId: string | null,
  category?: CommentCategory,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_comment',
      values: {
        text,
        parent_id: parentId ?? '',
        category: category ?? '',
      },
    } as IMethod,
  });
}

export async function deleteComment(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  commentId: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'delete_comment',
      values: { comment_id: commentId },
    } as IMethod,
  });
}

export async function getComments(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<Comment[]> {
  const raw = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_comments', values: {} } as IMethod,
  });
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, RawComment>;
  return Object.values(obj).map(normalizeComment);
}
