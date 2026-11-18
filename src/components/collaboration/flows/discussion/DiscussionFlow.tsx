import React, { useState, useCallback } from 'react';
import { MessageSquare, Reply, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

import type { FlowProps } from '../types';
import { useFlowData } from '../useFlowData';
import { useParticipants } from '../useParticipants';
import * as api from './discussionApi';
import type { Comment } from './discussionApi';
import { FlowLoading, FlowError } from '../FlowShell';
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
  const sort = (nodes: CommentNode[]) => {
    nodes.sort((a, b) => a.timestamp - b.timestamp);
    nodes.forEach(n => sort(n.children));
  };
  sort(roots);
  return roots;
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });


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
  currentUser: string;
  contractId: string;
}> = ({ node, depth, currentUser, contractId }) => {
  const [replying,  setReplying]  = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { isMe, nameOf } = useParticipants(currentUser);
  const isOwn      = isMe(node.author);
  const author     = nameOf(node.author);
  const hasChildren = node.children.length > 0;

  const handleReply = useCallback(async (text: string) => {
    await api.addComment(contractId, text, node.id);
    setReplying(false);
  }, [contractId, node.id]);

  const handleDelete = useCallback(async () => {
    await api.deleteComment(contractId, node.id);
  }, [contractId, node.id]);

  return (
    <div className={`${styles.commentItem} ${depth > 0 ? styles.nested : ''}`}>
      {/* Thread line for nested comments */}
      {depth > 0 && <div className={styles.threadLine} />}

      <div className={styles.commentBody}>
        {/* Header */}
        <div className={styles.commentHeader}>
          <span className={`${styles.avatar} ${isOwn ? styles.avatarMe : ''}`}>
            {author[0].toUpperCase()}
          </span>
          <span className={styles.authorName}>{author}</span>
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
              onClick={() => { void handleDelete(); }}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        {/* Reply compose */}
        {replying && (
          <ComposeBox
            placeholder={`Replying to ${author}…`}
            onSubmit={text => { void handleReply(text); }}
            onCancel={() => setReplying(false)}
            autoFocus
          />
        )}
      </div>

      {/* Children */}
      {!collapsed && node.children.length > 0 && (
        <div className={styles.children}>
          {node.children.map(child => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              currentUser={currentUser}
              contractId={contractId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root flow component
// ---------------------------------------------------------------------------
const DiscussionFlow: React.FC<FlowProps> = ({ instanceId, currentUser }) => {
  const { data, loading, error, retry } = useFlowData(instanceId, api.loadComments);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={retry} />;

  const flat = data ?? [];

  const tree = buildTree(flat);

  const handleTopLevel = async (text: string) => {
    await api.addComment(instanceId, text, null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <MessageSquare size={18} />
        <span>{flat.length} comment{flat.length !== 1 ? 's' : ''}</span>
      </div>

      <ComposeBox
        placeholder="Share your thoughts on this topic…"
        onSubmit={text => { void handleTopLevel(text); }}
      />

      {tree.length === 0 ? (
        <div className={styles.empty}>
          <MessageSquare size={36} />
          <p>No comments yet. Start the discussion!</p>
        </div>
      ) : (
        <div className={styles.commentList}>
          {tree.map(node => (
            <CommentItem
              key={node.id}
              node={node}
              depth={0}
              currentUser={currentUser}
              contractId={instanceId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionFlow;
