import React, { useState, useCallback, useMemo } from 'react';
import { MessageSquare, Reply, Trash2, ChevronDown, ChevronRight, Search, Globe, Lightbulb, AlertTriangle } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './discussionApi';
import type { Comment, CommentCategory } from './discussionApi';
import CountryBadge from '../shared/CountryBadge';
import { useAppSelector } from '../../../../store/hooks';
import styles from './DiscussionFlow.module.scss';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------
const CATEGORIES: { key: CommentCategory; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'evidence',  label: 'Evidence',  icon: Search,        color: '#3b82f6' },
  { key: 'impact',    label: 'Impact',    icon: Globe,         color: '#f59e0b' },
  { key: 'solutions', label: 'Solutions', icon: Lightbulb,     color: '#10b981' },
  { key: 'concerns',  label: 'Concerns',  icon: AlertTriangle, color: '#dc2626' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c])) as Record<CommentCategory, typeof CATEGORIES[number]>;

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
// Category badge (small inline label on comments)
// ---------------------------------------------------------------------------
const CategoryBadge: React.FC<{ category?: CommentCategory }> = ({ category }) => {
  if (!category) return null;
  const cfg = CATEGORY_MAP[category];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={styles.categoryBadge} style={{ color: cfg.color, borderColor: cfg.color }}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Compose box with category selector
// ---------------------------------------------------------------------------
const ComposeBox: React.FC<{
  placeholder: string;
  onSubmit: (text: string, category?: CommentCategory) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  showCategories?: boolean;
}> = ({ placeholder, onSubmit, onCancel, autoFocus, showCategories }) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<CommentCategory>('evidence');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed, showCategories ? category : undefined);
    setText('');
  };

  return (
    <div className={styles.composeBox}>
      {showCategories && (
        <div className={styles.categorySelector}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                className={`${styles.categoryChip} ${category === cat.key ? styles.categoryChipActive : ''}`}
                style={category === cat.key ? { borderColor: cat.color, color: cat.color } : undefined}
                onClick={() => setCategory(cat.key)}
                type="button"
              >
                <Icon size={13} /> {cat.label}
              </button>
            );
          })}
        </div>
      )}
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
  instanceId: string;
  depth: number;
  refresh: () => void;
  profiles: Record<string, { firstName?: string; lastName?: string; country?: string }>;
}> = ({ node, instanceId, depth, refresh, profiles }) => {
  const [replying,   setReplying]   = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const isOwn      = node.author === api.CURRENT_USER;
  const hasChildren = node.children.length > 0;

  const handleReply = useCallback((text: string) => {
    api.addComment(instanceId, text, node.id, node.category);
    refresh();
    setReplying(false);
  }, [instanceId, node.id, node.category, refresh]);

  const handleDelete = useCallback(() => {
    api.deleteComment(instanceId, node.id);
    refresh();
  }, [instanceId, node.id, refresh]);

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
          <span className={styles.authorName}>
            {authorLabel(node.author)}
            <CountryBadge countryCode={profiles[node.author]?.country} />
          </span>
          <CategoryBadge category={node.category} />
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
            onSubmit={(text) => handleReply(text)}
            onCancel={() => setReplying(false)}
            autoFocus
          />
        )}
      </div>

      {/* Children */}
      {!collapsed && node.children.length > 0 && (
        <div className={styles.children}>
          {node.children.map(child => (
            <CommentItem key={child.id} node={child} instanceId={instanceId} depth={depth + 1} refresh={refresh} profiles={profiles} />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root flow component
// ---------------------------------------------------------------------------
const DiscussionFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const profiles = useAppSelector((s) => s.communities.profiles) || {};
  const [flat, setFlat] = useState<Comment[]>(() => api.getComments(instanceId));
  const [activeFilter, setActiveFilter] = useState<CommentCategory | 'all'>('all');

  const refresh = useCallback(() => setFlat(api.getComments(instanceId)), [instanceId]);

  // Count comments per category (top-level only for progress)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of flat) {
      if (c.category) counts[c.category] = (counts[c.category] || 0) + 1;
    }
    return counts;
  }, [flat]);

  // Filter flat list then build tree
  const filteredFlat = useMemo(() => {
    if (activeFilter === 'all') return flat;
    // When filtering, include matching top-level comments and all their descendants
    const matchingRoots = new Set(flat.filter(c => c.category === activeFilter && !c.parentId).map(c => c.id));
    return flat.filter(c => {
      if (matchingRoots.has(c.id)) return true;
      // Walk up to check if any ancestor is a matching root
      let current = c;
      while (current.parentId) {
        if (matchingRoots.has(current.parentId)) return true;
        const parent = flat.find(p => p.id === current.parentId);
        if (!parent) break;
        current = parent;
      }
      return false;
    });
  }, [flat, activeFilter]);

  const tree = useMemo(() => buildTree(filteredFlat), [filteredFlat]);

  const handleTopLevel = useCallback((text: string, category?: CommentCategory) => {
    api.addComment(instanceId, text, null, category);
    refresh();
  }, [instanceId, refresh]);

  return (
    <div className={styles.container}>
      {/* Deliberation progress */}
      <div className={styles.progressBar}>
        {CATEGORIES.map(cat => {
          const count = categoryCounts[cat.key] || 0;
          const Icon = cat.icon;
          return (
            <span key={cat.key} className={styles.progressItem} style={{ color: cat.color }}>
              <Icon size={13} /> {count}
            </span>
          );
        })}
      </div>

      <div className={styles.header}>
        <MessageSquare size={18} />
        <span>{flat.length} comment{flat.length !== 1 ? 's' : ''}</span>
      </div>

      <ComposeBox
        placeholder="Share your thoughts on this topic…"
        onSubmit={handleTopLevel}
        showCategories
      />

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <button
          className={`${styles.filterChip} ${activeFilter === 'all' ? styles.filterChipActive : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = categoryCounts[cat.key] || 0;
          return (
            <button
              key={cat.key}
              className={`${styles.filterChip} ${activeFilter === cat.key ? styles.filterChipActive : ''}`}
              style={activeFilter === cat.key ? { borderColor: cat.color, color: cat.color } : undefined}
              onClick={() => setActiveFilter(cat.key)}
            >
              <Icon size={13} /> {cat.label} {count > 0 && <span className={styles.filterCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      {tree.length === 0 ? (
        <div className={styles.empty}>
          <MessageSquare size={36} />
          <p>{activeFilter === 'all' ? 'No comments yet. Start the discussion!' : `No ${activeFilter} comments yet.`}</p>
        </div>
      ) : (
        <div className={styles.commentList}>
          {tree.map(node => (
            <CommentItem key={node.id} node={node} instanceId={instanceId} depth={0} refresh={refresh} profiles={profiles} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionFlow;
