import React, { useState, useCallback, useMemo } from 'react';
import { MessageSquare, Reply, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './discussionApi';
import type { Comment } from './discussionApi';
import styles from './DiscussionFlow.module.scss';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type CommentNode = Comment & { children: CommentNode[] };

function buildTree(flat: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  flat.forEach(c => map.set(c.id, { ...c, children: [] }));
  const roots: CommentNode[] = [];
  flat.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(node);
    else roots.push(node);
  });
  const sort = (nodes: CommentNode[]) => { nodes.sort((a, b) => a.timestamp - b.timestamp); nodes.forEach(n => sort(n.children)); };
  sort(roots);
  return roots;
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const authorLabel = (id: string) => id === api.CURRENT_USER ? 'You' : id;

// ---------------------------------------------------------------------------
// Compose box (used both for top-level and replies)
// ---------------------------------------------------------------------------
const ComposeBox: React.FC<{
  placeholder: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}> = ({ placeholder, onSubmit, onCancel, autoFocus }) => {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <div className={styles.composeBox}>
      <textarea
        className={styles.composeTextarea}
        rows={3}
        placeholder={placeholder}
        value={text}
        autoFocus={autoFocus}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === 'Escape' && onCancel) onCancel();
        }}
      />
      <div className={styles.composeActions}>
        <button className={styles.btnSubmit} onClick={submit} disabled={!text.trim()}>
          <MessageSquare size={14} />
          {onCancel ? 'Reply' : 'Comment'}
        </button>
        {onCancel && (
          <button className={styles.btnCancel} onClick={onCancel}>Cancel</button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single comment node — recursive
// ---------------------------------------------------------------------------

const CommentItem: React.FC<{
  node: CommentNode;
  depth: number;
  refresh: () => void;
}> = ({ node, depth, refresh }) => {
  const [replying,   setReplying]   = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const isOwn      = node.author === api.CURRENT_USER;
  const hasChildren = node.children.length > 0;

  const handleReply = useCallback((text: string) => {
    api.addComment(text, node.id);
    refresh();
    setReplying(false);
  }, [node.id, refresh]);

  const handleDelete = useCallback(() => {
    api.deleteComment(node.id);
    refresh();
  }, [node.id, refresh]);

  return (
    <div className={`${styles.commentItem} ${depth > 0 ? styles.nested : ''}`}>
      {/* Thread line for nested comments */}
      {depth > 0 && <div className={styles.threadLine} />}

      <div className={styles.commentBody}>
        {/* Header */}
        <div className={styles.commentHeader}>
          <span className={`${styles.avatar} ${isOwn ? styles.avatarMe : ''}`}>
            {authorLabel(node.author)[0].toUpperCase()}
          </span>
          <span className={styles.authorName}>{authorLabel(node.author)}</span>
          <span className={styles.timestamp}>{formatTime(node.timestamp)}</span>
          {hasChildren && (
            <button
              className={styles.collapseBtn}
              onClick={() => setCollapsed(v => !v)}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed
                ? <><ChevronRight size={14} /> {node.children.length}</>
                : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Text */}
        <p className={styles.commentText}>{node.text}</p>

        {/* Actions */}
        <div className={styles.commentActions}>
          <button
            className={styles.actionBtn}
            onClick={() => setReplying(v => !v)}
          >
            <Reply size={13} /> Reply
          </button>
          {isOwn && (
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
              onClick={handleDelete}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        {/* Reply compose */}
        {replying && (
          <ComposeBox
            placeholder={`Replying to ${authorLabel(node.author)}…`}
            onSubmit={handleReply}
            onCancel={() => setReplying(false)}
            autoFocus
          />
        )}
      </div>

      {/* Children */}
      {!collapsed && node.children.length > 0 && (
        <div className={styles.children}>
          {node.children.map(child => (
            <CommentItem key={child.id} node={child} depth={depth + 1} refresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root flow component
// ---------------------------------------------------------------------------
const DiscussionFlow: React.FC<FlowProps> = () => {
  const [flat, setFlat] = useState<Comment[]>(() => api.getComments());

  const refresh = useCallback(() => setFlat(api.getComments()), []);

  const tree = useMemo(() => buildTree(flat), [flat]);

  const handleTopLevel = useCallback((text: string) => {
    api.addComment(text, null);
    refresh();
  }, [refresh]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <MessageSquare size={18} />
        <span>{flat.length} comment{flat.length !== 1 ? 's' : ''}</span>
      </div>

      <ComposeBox placeholder="Share your thoughts on this topic…" onSubmit={handleTopLevel} />

      {tree.length === 0 ? (
        <div className={styles.empty}>
          <MessageSquare size={36} />
          <p>No comments yet. Start the discussion!</p>
        </div>
      ) : (
        <div className={styles.commentList}>
          {tree.map(node => (
            <CommentItem key={node.id} node={node} depth={0} refresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionFlow;
